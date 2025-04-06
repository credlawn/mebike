import frappe
from frappe.model.document import Document

class ReceivedPayment(Document):
    def validate(self):
        self.set_partner_name()
        
    def before_insert(self):
        self.autoname()
        
    def after_insert(self):
        self.update_transaction_in_partner_book()
        
    def autoname(self):
        last_doc = frappe.get_all('Received Payment', 
                                filters={'name': ['like', 'CR/%']}, 
                                fields=['name'], 
                                order_by='name desc', 
                                limit=1)
        if last_doc:
            last_number = int(last_doc[0].name.split('/')[1])
            new_number = last_number + 1
        else:
            new_number = 1
            
        if new_number > 9999: 
            frappe.throw("Maximum number reached (CR/9999)")
        self.name = f"CR/{new_number:04d}"
        
    def set_partner_name(self):
        if self.partner_code and not self.partner_name:
            business_name = frappe.db.get_value("Partner", self.partner_code, "business_name")
            if business_name:
                self.db_set('partner_name', business_name)
                frappe.db.commit()  # Explicit commit to ensure save
    
    def update_transaction_in_partner_book(self):

        partner_book = frappe.get_doc("Partner Books", {"partner_code": self.partner_code})
        
        current_balance = partner_book.current_balance
        transaction_amount = self.transaction_amount  

        new_balance = current_balance + transaction_amount
        
        partner_book.append("transaction_history", {
            "transaction_amount": self.transaction_amount,
            "transaction_date": self.transaction_date,
            "transaction_type": 'Credit',
            "remarks": self.remarks
        })
        partner_book.current_balance = new_balance
        partner_book.save()
        frappe.db.commit()