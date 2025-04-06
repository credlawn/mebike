import frappe
from frappe.model.document import Document
import re
from frappe.utils import nowdate

class Partner(Document):
    def validate(self):
        self.check_mobile_no()
        
    def before_insert(self):
        self.autoname()
        
    def autoname(self):
        last_doc = frappe.get_all('Partner', filters={'name': ['like', 'PA%']}, fields=['name'], order_by='name desc', limit=1)
        new_number = int(last_doc[0].name[2:]) + 1 if last_doc else 1
        if new_number > 999: frappe.throw("Maximum inventory items (PA999) reached")
        
        self.name = f"PA{new_number:03d}"

        
        
    def check_mobile_no(self):
        if not self.contact_no:
            frappe.throw("Contact Number is missing. Please enter a Mobile No.")
        elif not re.match(r'^\d{10}$', self.contact_no): 
            frappe.throw("Contact Number must be 10 digits.")
        
        if self.business_name:
            self.business_name = self.business_name.title().strip()

    @frappe.whitelist()
    def after_insert(self):
        self.create_warehouse()
        self.create_partner_books()

    @frappe.whitelist()
    def on_update(self):
        self.create_warehouse()
        self.create_partner_books()
        self.reload()

    def create_warehouse(self):
        existing_warehouse = frappe.db.exists('Warehouse', {'partner_code': self.name})

        if existing_warehouse:
            warehouse = frappe.get_doc('Warehouse', existing_warehouse)
            warehouse.warehouse_name = '-'.join(self.business_name.split()[:1]) + '-' + self.name
            warehouse.warehouse_city = self.city
            warehouse.contact_person = self.key_person_name
            warehouse.mobile_no = self.contact_no
            warehouse.save(ignore_permissions=True)
        else:
            warehouse = frappe.get_doc({
                'doctype': 'Warehouse',
                'warehouse_name': '-'.join(self.business_name.split()[:1]) + '-' + self.name,
                'warehouse_type': 'Partner',
                'warehouse_city': self.city,
                'contact_person': self.key_person_name,
                'mobile_no': self.contact_no,
                'partner_code': self.name,
                'partner_name': self.business_name
            })
            warehouse.insert(ignore_permissions=True)
        
        frappe.db.commit()
    
    def create_partner_books(self):
        existing_partner_books = frappe.db.exists('Partner Books', {'partner_code': self.name})
        
        if existing_partner_books:
            partner_books = frappe.get_doc('Partner Books', existing_partner_books)
            partner_books.total_credit_limit = self.credit_limit
            partner_books.save(ignore_permissions=True)
        else:
            partner_books = frappe.get_doc({
                'doctype': 'Partner Books',
                'partner_code': self.name,
                'partner_name': self.business_name,
                'total_credit_limit': self.credit_limit
                
        })