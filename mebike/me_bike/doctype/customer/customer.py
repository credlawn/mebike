import frappe
from frappe.model.document import Document

class Customer(Document):
    def validate(self):

        if not self.customer_mapping:
            self.customer_mapping = frappe.session.user
