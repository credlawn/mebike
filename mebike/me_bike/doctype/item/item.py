import frappe
from frappe.model.document import Document
from datetime import datetime

class Item(Document):
    def validate(self):

        if not self.tbi_price_before_gst:
            frappe.throw("Please Enter TBI Price")
        if not self.tbi_gst_slab:
            frappe.throw("Please Enter GST Slab")

        # Calculate TBI GST and price with GST
        self.tbi_gst = self.tbi_price_before_gst * self.tbi_gst_slab * 0.01
        self.tbi_price_with_gst = round(self.tbi_price_before_gst + self.tbi_gst, 0)

        # Calculate partner price before GST, GST, and price with GST
        self.partner_price_before_gst = (self.item_mrp / (1 + self.partner_discount * 0.01)) / (1 + self.tbi_gst_slab * 0.01)
        self.partner_gst = self.partner_price_before_gst * self.tbi_gst_slab * 0.01
        self.partner_price_with_gst = round(self.partner_price_before_gst + self.partner_gst, 0)

        # Calculate margins
        self.partner_margin = self.item_mrp - self.partner_price_with_gst
        self.tbi_margin = self.partner_price_with_gst - self.tbi_price_with_gst

        # Set other validation
        self.set_item_name()
        self.format_model_name()

    def before_insert(self):
        self.autoname()

    def autoname(self):
        self.name = self.generate_item_code()

    def generate_item_code(self):
        existing_codes = self.get_existing_codes()
        next_code = self.get_next_code(existing_codes)
        return next_code

    def get_existing_codes(self):
        current_month = datetime.now().strftime('%m')
        return [item.name for item in frappe.get_all('Item', filters={'name': ('like', f'M{current_month}%')}, fields=['name'])]

    def get_next_code(self, existing_codes):
        if not existing_codes:
            return f"M{datetime.now().strftime('%m')}001"
        return self.increment_code(max(existing_codes))

    def increment_code(self, code):
        current_month = datetime.now().strftime('%m')
        number = int(code[-3:])

        if number == 999:
            raise ValueError("Item code number has reached the limit of 999 for the current month.")

        new_number = number + 1
        return f"M{current_month}{new_number:03}"
    
    def format_model_name(self):
        self.model = self.model.strip().title()
        if not self.model.lower().startswith('me '):
            self.model = 'ME ' + self.model
        else:
            self.model = 'ME ' + self.model[3:].title()

    def set_item_name(self):
        category_first_letter = self.item_category[0].upper() if self.item_category else ""
        
        self.model = self.model.strip().title()
        if not self.model.lower().startswith('me '):
            self.model = 'ME ' + self.model
        else:
            self.model = 'ME ' + self.model[3:].title()

        model_name = self.model
        self.item_name = f"{category_first_letter}- {model_name}- {self.item_color}"
    
    def on_update(self):
        self.set_item_status()
        self.reload()
        
    def after_insert(self):
        self.set_item_status()
    
    def set_item_status(self):
        new_status = "In Stock" if self.item_current_stock > 0 else "Out of Stock"
        frappe.db.set_value("Item", self.name, "status", new_status)
        frappe.db.commit()
        