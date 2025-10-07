import frappe
from frappe.model.document import Document

class PartnerBooks(Document):
    def benfore_insert(self):
        self.autoname()
     
    def on_update(self):
        self.calculate_available_credit_limit()
        self.set_partner_books_owner()
        self.reload()
    
    def autoname(self):
        self.name = f"BO/{self.partner_code}"
    
    
    def calculate_available_credit_limit(self):
        available_credit_limit = self.total_credit_limit + self.current_balance
        frappe.db.set_value("Partner Books", self.name, "available_credit_limit", available_credit_limit)
        frappe.db.commit()
        
    def set_partner_books_owner(self):
        email = frappe.db.get_value('Partner', self.partner_code, 'email')
        if email:
            frappe.db.set_value('Partner Books', self.name, 'owner', email)
        
    