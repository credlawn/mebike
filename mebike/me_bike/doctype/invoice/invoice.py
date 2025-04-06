import frappe
from frappe.model.document import Document
from datetime import datetime

class Invoice(Document):
    def validate(self):
        self.set_invoice_number()
        self.set_billing_details()
        self.calculate_cat_gst()
        self.calculate_total_amount()

    def before_insert(self):
        self.autoname()
        
    def after_insert(self):
        self.create_record_in_partner_book_from_invoice()

    def autoname(self):
        """Automatically generate the name for the document."""
        if not self.name:
           self.name = self.generate_purchase_name()

    def generate_purchase_name(self):
        """Generate the purchase name in the format MB/YY-YY/0001."""
        prefix = self.get_prefix()
        existing_codes = self.get_existing_codes(prefix)
        next_code = self.get_next_code(prefix, existing_codes)
        return next_code

    def get_prefix(self):
        """Generate the prefix (MB/YY-YY/)."""
        financial_year = self.get_financial_year()
        return f"MB/{financial_year}/"

    def get_financial_year(self):
        """Calculate the financial year in the format YY-YY."""
        today = datetime.now()
        year = today.year
        month = today.month

        # Financial year starts on April 1st
        if month >= 4:
            financial_year_start = year
            financial_year_end = year + 1
        else:
            financial_year_start = year - 1
            financial_year_end = year

        # Format as YY-YY
        return f"{financial_year_start % 100:02d}-{financial_year_end % 100:02d}"

    def get_existing_codes(self, prefix):
        """Fetch all existing codes with the same prefix."""
        existing_codes = frappe.get_all(
            "Invoice",
            filters={"name": ["like", prefix + "%"]},
            fields=["name"],
            order_by="name desc"
        )
        return existing_codes

    def get_next_code(self, prefix, existing_codes):
        """Generate the next incremental code."""
        if existing_codes:
            last_code = existing_codes[0].name
            last_number = int(last_code.split("/")[-1])  # Extract the number part
            next_number = last_number + 1
        else:
            next_number = 1

        # Format the next code (MB/YY-YY/0001)
        return prefix + f"{next_number:04d}"
    
    
    def set_invoice_number(self):
        self.invoice_no = self.name
        
    def set_billing_details(self):
        partner = frappe.get_doc('Partner', self.partner_code)
        self.party_name = partner.business_name
        self.gst_no = partner.gst_no   
        self.billed_to_address = partner.business_address
        self.state = partner.state
        self.state_code = partner.state_code
        
    def calculate_cat_gst(self):
        if self.state_code == "23":
            self.igst_amount = self.total_gst_amount
            self.sgst_amount = 0
            self.cgst_amount = 0
        else:
            self.cgst_amount = self.total_gst_amount * 0.5
            self.sgst_amount = self.total_gst_amount * 0.5
            self.igst_amount = 0
            
    def calculate_total_amount(self):
        if self.state_code == "23":
            self.grand_total_amount = self.invoice_amount + self.igst_amount
        else:
            self.grand_total_amount = self.invoice_amount + self.sgst_amount + self.cgst_amount
        self.rounded_total_amount = round(self.grand_total_amount)
    
    def create_record_in_partner_book_from_invoice(self):
        partner_book = frappe.get_doc("Partner Books", {"partner_code": self.partner_code})
        current_balance = partner_book.current_balance
        transaction_amount = self.rounded_total_amount
        
        new_balance = current_balance - transaction_amount

        partner_book.append("transaction_history", {
            "transaction_date": self.invoice_date,
            "transaction_type": "Debit",
            "transaction_amount": self.rounded_total_amount,
            "remarks": self.invoice_no
        })
        partner_book.current_balance = new_balance
        partner_book.save()
        
        
            
            
            
        
        

    
             
        
                