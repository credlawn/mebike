import frappe
from frappe.model.document import Document
from datetime import datetime

class Purchase(Document):
    def after_insert(self):
        if self.status == "Ready for Billing":
            self.db_set("docstatus", 1)
            self.reload()
        
    def validate(self):
        self.validate_total_quantity()
        self.set_po_number()
        self.set_partner_name()
        self.set_docstatus()

    def before_insert(self):
        self.autoname()
        
    def on_update(self):
        self.refresh_available_credit_limit()
        self.reload()

    def autoname(self):
        """Automatically generate the name for the document."""
        if not self.name:
           self.name = self.generate_purchase_name()

    def generate_purchase_name(self):
        """Generate the purchase name in the format PO/YY-YY/0001."""
        prefix = self.get_prefix()
        existing_codes = self.get_existing_codes(prefix)
        next_code = self.get_next_code(prefix, existing_codes)
        return next_code

    def get_prefix(self):
        """Generate the prefix (MB/YY-YY/)."""
        financial_year = self.get_financial_year()
        return f"PO/{financial_year}/"

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
            "Purchase",
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
    
    def set_po_number(self):
        self.purchase_order_no = self.name

    def validate_total_quantity(self):
        if self.total_quantity < 1:
            frappe.throw("Total Quantity cannot be Zero")
    


    def set_partner_name(self):
        if not self.partner_name or self.partner_name == "Not Mapped":
            user_email = frappe.session.user
            partner = frappe.get_all("Partner", filters={"email": user_email}, fields=["name", "business_name"])

            if partner:
                self.partner_code = partner[0].name
                self.partner_name = partner[0].business_name
            else:
                self.partner_code = None
                self.partner_name = "Not Mapped"

    @frappe.whitelist()
    def create_invoice_from_purchase(purchase_doc_name):

        purchase_doc = frappe.get_doc('Purchase', purchase_doc_name)
        invoice_doc = frappe.new_doc('Invoice')
        invoice_doc.billed_quantity = purchase_doc.total_quantity
        invoice_doc.insert()
        return invoice_doc.name
    
    def refresh_available_credit_limit(self):
        credit_limit = frappe.db.get_value("Partner Books", {"partner_code": self.partner_code}, "available_credit_limit")
        frappe.db.set_value(self.doctype, self.name, "available_credit_limit", credit_limit)
        frappe.db.commit()
        



