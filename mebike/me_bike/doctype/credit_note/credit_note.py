import frappe
from frappe.model.document import Document
import datetime
import random
import string


class CreditNote(Document):
    def validate(self):
        self.set_partner_name()
        self.validate_cn_date()
        if self.is_new() or self.has_cn_date_changed():
            self.create_cn_no()

    def before_insert(self):
        self.autoname()
        
    def after_insert(self):
        self.update_transaction_in_partner_book(add=True)
        
    def on_update(self):
        self.update_transaction_in_partner_book(update=True)
        
    def on_trash(self):
        self.update_transaction_in_partner_book(delete=True)
        
    def autoname(self):
        max_attempts = 10
        for _ in range(max_attempts):
            code = self.generate_random_code()
            if not frappe.db.exists("Credit Note", code):
                self.name = code
                return
            
    def generate_random_code(self, length=4):
        characters = string.ascii_uppercase + string.digits
        return ''.join(random.choices(characters, k=length))

    def set_partner_name(self):
        if self.partner_code and not self.partner_name:
            business_name = frappe.db.get_value("Partner", self.partner_code, "business_name")
            if business_name:
                self.db_set('partner_name', business_name)
                frappe.db.commit()

    def validate_cn_date(self):
        if not self.cn_date:
            frappe.throw("CN Date is required")

        cn_date = datetime.datetime.strptime(self.cn_date, "%Y-%m-%d").date()
        year = cn_date.strftime("%y")
        month = cn_date.strftime("%m")
        prefix = f"CN/{year}{month}/"

        if self.old_cn and self.cn_month:
            month_map = {
                "January": "01", "February": "02", "March": "03", "April": "04",
                "May": "05", "June": "06", "July": "07", "August": "08",
                "September": "09", "October": "10", "November": "11", "December": "12"
            }
            selected_month = month_map.get(self.cn_month)
            if not selected_month:
                frappe.throw("Invalid month selected in 'cn_month'")
            if month != selected_month:
                frappe.throw(f"CN Date's month ({cn_date.strftime('%B')}) does not match selected CN Month ({self.cn_month})")

        last_doc = frappe.get_all(
            'Credit Note',
            filters={'cn_no': ['like', f'{prefix}%'], 'docstatus': ['<', 2]},
            fields=['cn_date'],
            order_by='cn_date desc',
            limit=1
        )

        if last_doc and last_doc[0].cn_date:
            last_date = last_doc[0].cn_date
            if isinstance(last_date, str):
                last_date = datetime.datetime.strptime(last_date, "%Y-%m-%d").date()
            if cn_date < last_date:
                frappe.throw(f"CN Date cannot be older than {last_date.strftime('%d %B %Y')}")
                
    def has_cn_date_changed(self):
        if not self.name:
            return True
        old_cn_date = frappe.db.get_value("Credit Note", self.name, "cn_date")
        if not old_cn_date:
            return True
        if isinstance(old_cn_date, str):
            old_cn_date = datetime.datetime.strptime(old_cn_date, "%Y-%m-%d").date()
        new_cn_date = datetime.datetime.strptime(self.cn_date, "%Y-%m-%d").date()
        return old_cn_date != new_cn_date
                
    def create_cn_no(self):
        if not self.cn_date:
            frappe.throw("CN Date is required to generate the name")

        cn_date = datetime.datetime.strptime(self.cn_date, "%Y-%m-%d").date()
        year = cn_date.strftime("%y")
        month = cn_date.strftime("%m")
        prefix = f"CN/{year}{month}/"

        last_doc = frappe.get_all(
            'Credit Note',
            filters={'cn_no': ['like', f'{prefix}%'], 'docstatus': ['<', 2]},
            fields=['cn_no'],
            order_by='cn_no desc',
            limit=1
        )

        if last_doc:
            last_number = int(last_doc[0].cn_no.split('/')[-1])
            new_number = last_number + 1
        else:
            new_number = 1

        if new_number > 999:
            frappe.throw("Maximum number reached for the month (NNN > 999)")

        self.cn_no = f"{prefix}{new_number:03d}"

        
    def update_transaction_in_partner_book(self, add=False, update=False, delete=False):
        if not self.partner_code or not self.name:
            return

        partner_book = frappe.get_doc("Partner Books", {"partner_code": self.partner_code})
        transaction_code = self.name
        transaction_list = partner_book.transaction_history or []
        
        existing = None
        for entry in transaction_list:
            if entry.transaction_code == transaction_code:
                existing = entry
                break
        
        if delete and existing:
            partner_book.current_balance -= existing.transaction_amount
            partner_book.transaction_history.remove(existing)

        elif update:
            if existing:
                # Reverse previous amount
                partner_book.current_balance -= existing.transaction_amount
                # Update values
                existing.transaction_amount = self.transaction_amount
                existing.transaction_date = self.cn_date
                existing.ref_no = self.cn_no
                existing.transaction_mode = 'Credit Note'
                existing.transaction_type = 'Credit'
                existing.remarks = f"{self.cn_no} - {self.remarks}"
                # Add new amount
                partner_book.current_balance += self.transaction_amount
            else:
                # Treat as new if not found
                partner_book.append("transaction_history", {
                    "transaction_code": self.name,
                    "transaction_amount": self.transaction_amount,
                    "transaction_date": self.cn_date,
                    "ref_no": self.cn_no,
                    "transaction_mode": 'Credit Note',
                    "transaction_type": 'Credit',
                    "remarks": f"{self.cn_no} - {self.remarks}"
                })
                partner_book.current_balance += self.transaction_amount

        elif add:
            partner_book.append("transaction_history", {
                "transaction_code": self.name,
                "transaction_amount": self.transaction_amount,
                "transaction_date": self.cn_date,
                "ref_no": self.cn_no,
                "transaction_mode": 'Credit Note',
                "transaction_type": 'Credit',
                "remarks": f"{self.cn_no} - {self.remarks}"
            })
            partner_book.current_balance += self.transaction_amount

        partner_book.save()
        frappe.db.commit()
