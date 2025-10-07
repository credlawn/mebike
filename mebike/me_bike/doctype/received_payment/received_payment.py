import frappe
from frappe.model.document import Document

class ReceivedPayment(Document):
    def validate(self):
        self.set_partner_name()
        
    def before_insert(self):
        self.autoname()
        
    def after_insert(self):
        self.update_transaction_in_partner_book(add=True)
    
    def on_update(self):
        self.update_transaction_in_partner_book(update=True)

    def on_trash(self):
        self.update_transaction_in_partner_book(delete=True)

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
                frappe.db.commit()

    def update_transaction_in_partner_book(self, add=False, update=False, delete=False):
        if not self.partner_code or not self.name:
            return

        partner_book = frappe.get_doc("Partner Books", {"partner_code": self.partner_code})
        transaction_code = self.name
        transaction_list = partner_book.transaction_history or []
        
        # Locate existing transaction (if any)
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
                existing.transaction_date = self.transaction_date
                existing.transaction_mode = self.transaction_mode
                existing.transaction_type = 'Credit'
                existing.remarks = self.remarks
                # Add new amount
                partner_book.current_balance += self.transaction_amount
            else:
                # Treat as new if not found
                partner_book.append("transaction_history", {
                    "transaction_code": self.name,
                    "transaction_amount": self.transaction_amount,
                    "transaction_date": self.transaction_date,
                    "transaction_mode": self.transaction_mode,
                    "transaction_type": 'Credit',
                    "remarks": self.remarks
                })
                partner_book.current_balance += self.transaction_amount

        elif add:
            partner_book.append("transaction_history", {
                "transaction_code": self.name,
                "transaction_amount": self.transaction_amount,
                "transaction_date": self.transaction_date,
                "transaction_mode": self.transaction_mode,
                "transaction_type": 'Credit',
                "remarks": self.remarks
            })
            partner_book.current_balance += self.transaction_amount

        partner_book.save()
        frappe.db.commit()
