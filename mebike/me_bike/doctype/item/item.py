import frappe
from frappe.model.document import Document
from datetime import datetime

class Item(Document):
    def validate(self):

        if not self.tbi_gst_slab:
            frappe.throw("Please Enter GST Slab")
            
        self.tbi_price_before_gst = self.tbi_price_with_gst / (1 + (self.tbi_gst_slab / 100))
        self.tbi_gst = self.tbi_price_with_gst - self.tbi_price_before_gst

        self.partner_price_with_gst = round(self.item_mrp - (self.item_mrp * self.partner_discount / 100), 0)
        self.partner_price_before_gst = self.partner_price_with_gst / (1 + (self.tbi_gst_slab / 100))
        self.partner_gst = self.partner_price_with_gst - self.partner_price_before_gst

        self.partner_margin = self.item_mrp - self.partner_price_with_gst
        self.tbi_margin = self.partner_price_with_gst - self.tbi_price_with_gst
        
        self.customer_discount = self.item_mrp * ((self.customer_discount_per or 0) / 100)
        self.customer_price_with_gst = self.item_mrp - self.customer_discount
        self.customer_price_pre_gst = self.customer_price_with_gst / (1 + (self.tbi_gst_slab / 100))
        self.customer_gst = self.customer_price_with_gst - self.customer_price_pre_gst

        # Set other validation
        self.set_item_name()
        self.format_model_name()
        self.create_match_code()

    def before_insert(self):
        self.autoname()
        

    def autoname(self):
        self.name = self.generate_item_code()
    
    def create_match_code(self):
        if not self.match_code:
            last_code = frappe.db.get_value(
                "Item",
                filters={},
                fieldname="MAX(match_code)"
            )
            self.match_code = int(last_code or 0) + 1
        

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
        self.item_name = f"{category_first_letter}- {model_name} {self.item_sub_category}- {self.item_color}"
    
    def on_update(self):
        self.set_item_status()
        self.reload()
        
    def after_insert(self):
        self.set_item_status()
        self.create_item_variants()
    
    def set_item_status(self):
        new_status = "In Stock" if self.item_current_stock > 0 else "Out of Stock"
        frappe.db.set_value("Item", self.name, "status", new_status)
        frappe.db.commit()
    
    @frappe.whitelist()
    def create_item_variants(item):
        if item.variant_created:
            return
        if item.item_category != 'Vehicle':
            return

        frappe.db.set_value('Item', item.name, 'variant_created', True)

        active_colors = frappe.get_all('Item Color', filters={'color_status': 'Active', 'name': ['!=', item.item_color], 'variant_for': 'Vehicle'}, fields=['name'])

        for color in active_colors:
            new_item = frappe.new_doc('Item')
            new_item.item_mrp = item.item_mrp
            new_item.model = item.model
            new_item.hsn_code = item.hsn_code
            new_item.item_weight = item.item_weight
            new_item.item_category = item.item_category
            new_item.item_sub_category = item.item_sub_category
            new_item.tbi_gst_slab = item.tbi_gst_slab
            new_item.partner_discount = item.partner_discount
            new_item.customer_discount_per = item.customer_discount_per
            new_item.tbi_price_with_gst = item.tbi_price_with_gst
            new_item.item_color = color.name
            new_item.create_variant = False
            new_item.variant_created = True
            new_item.insert()

        frappe.db.commit()

        