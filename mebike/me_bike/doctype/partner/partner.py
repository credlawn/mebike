import frappe
from frappe.model.document import Document
import re
from frappe.utils import nowdate

class Partner(Document):
    def validate(self):
        self.check_fields_value()
        
    def before_insert(self):
        self.autoname()
        
    def autoname(self):
        last_doc = frappe.get_all('Partner', filters={'name': ['like', 'PA%']}, fields=['name'], order_by='name desc', limit=1)
        new_number = int(last_doc[0].name[2:]) + 1 if last_doc else 1
        if new_number > 999: frappe.throw("Maximum inventory items (PA999) reached")
        self.name = f"PA{new_number:03d}"

    def check_fields_value(self):
        if not re.match(r'^\d{10}$', self.contact_no):
            frappe.throw("Contact Number must be 10 digits.")
            
        if not re.match(r'^[A-Za-z]{5}\d{4}[A-Za-z]$', self.pan_no, re.IGNORECASE):
            frappe.throw("PAN Number is Not Correct.")
        
        if not re.match(r'^[A-Za-z0-9]{15}$', self.gst_no):
            frappe.throw("GST Number is Not Correct.")
        
        self.business_name = self.business_name.title().strip() if self.business_name else self.business_name
        self.key_person_name = self.key_person_name.title().strip() if self.key_person_name else self.key_person_name
        self.email = self.email.lower().strip() if self.email else self.email
        self.business_address = self.business_address.title().strip() if self.business_address else self.business_address
        self.landmark = self.landmark.title().strip() if self.landmark else self.landmark
        self.city = self.city.title().strip() if self.city else self.city
        self.pan_no = self.pan_no.upper().strip() if self.pan_no else self.pan_no
        self.gst_no = self.gst_no.upper().strip() if self.gst_no else self.gst_no
        self.ifsc_code = self.ifsc_code.upper().strip() if self.ifsc_code else self.ifsc_code
        self.state_code = self.gst_no[:2] if self.gst_no else '00'

    @frappe.whitelist()
    def after_insert(self):
        self.create_warehouse()
        self.create_partner_books()
        self.create_user()

    @frappe.whitelist()
    def on_update(self):
        self.create_warehouse()
        self.create_partner_books()
        self.set_partner_owner()
        self.create_user()
        self.reload()
        
    def set_partner_owner(self):
        frappe.db.set_value('Partner', self.name, 'owner', self.email)
        frappe.db.commit()

    def create_warehouse(self):
        if self.status == "Active":
            existing_warehouse = frappe.db.exists('Warehouse', {'partner_code': self.name})
            if existing_warehouse:
                warehouse = frappe.get_doc('Warehouse', existing_warehouse)
                warehouse.warehouse_name = '-'.join(self.business_name.split()[:1]) + '-' + self.name
                warehouse.warehouse_city = self.city
                warehouse.contact_person = self.key_person_name
                warehouse.mobile_no = self.contact_no
                warehouse.email = self.email
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
                    'email': self.email,
                    'partner_name': self.business_name
                })
                warehouse.insert(ignore_permissions=True)
            frappe.db.commit()
        
    def create_partner_books(self):
        if self.status == "Active":
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
                partner_books.insert(ignore_permissions=True)
            frappe.db.commit()
        
    def create_user(self):
        if not self.email:
            return

        user_exists = frappe.db.exists("User", self.email)
        user_fields = {
            "enabled": 1 if self.status == "Active" else 0,
            "first_name": self.business_name,
            "full_name": self.business_name,
            "search_bar": 0,
            "view_switcher": 0,
            "bulk_actions": 0,
            "list_sidebar": 0,
            "default_workspace": "Me Bike"
        }

        if user_exists:
            user = frappe.get_doc("User", self.email)
            has_changes = False

            for field, new_value in user_fields.items():
                if user.get(field) != new_value:
                    user.set(field, new_value)
                    has_changes = True

            if has_changes:
                user.save(ignore_permissions=True)
                frappe.db.commit()

        elif self.status == "Active":
            user_name = self.email.split('@')[0]
            password = "MeBike@2025"
            user = frappe.get_doc({
                "doctype": "User",
                "email": self.email,
                "username": user_name,
                "send_welcome_email": 1,
                "search_bar": 0,
                "list_sidebar": 0,
                "bulk_actions": 0,
                "view_switcher": 0,
                "new_password": password,
                **user_fields,
                "roles": [{
                    "role": "Manns Partner"
                }]
            })
            user.insert(ignore_permissions=True)
            frappe.db.commit()
            frappe.msgprint(f"""
                <b>User created:</b><br><br>
                <b>Username:</b> {self.email}<br><br>
                <b>Password:</b> {password}
            """)

    