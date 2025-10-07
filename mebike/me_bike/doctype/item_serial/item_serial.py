import frappe
import random
from frappe.model.document import Document

class ItemSerial(Document):
    def before_insert(self):
        self.autoname()
        self.set_item_code()
        
    def validate(self):
        self.get_item_details()
        self.serial_no_case()
        
    def set_item_code(self):
        item_code = frappe.get_doc("Item", {"match_code": self.match_code})
        self.item_code = item_code.name
    
    def autoname(self):
        while True:
            code = f'M{random.randint(1000, 9999)}'
            if not frappe.get_all('Item Serial', filters={'name': code}):
                self.name = code
                break
    
    def get_item_details(self):
        item = frappe.get_doc("Item", self.item_code)
        self.item_name = item.item_name
        self.item_category = item.item_category
        self.item_sub_category = item.item_sub_category
        self.item_color = item.item_color
        self.model = item.model
        self.mrp = item.item_mrp
        self.customer_price_pre_gst = item.customer_price_pre_gst
        self.customer_gst = item.customer_gst
        self.customer_price_with_gst = item.customer_price_with_gst
        self.partner_price_with_gst = item.partner_price_with_gst
        self.partner_gst = item.partner_gst
        self.partner_price_pre_gst = item.partner_price_before_gst
        self.manns_price_with_gst = item.tbi_price_with_gst
        self.manns_gst = item.tbi_gst
        self.manns_price_pre_gst = item.tbi_price_before_gst
        self.gst_slab = item.tbi_gst_slab
        self.item_weight = item.item_weight
        self.hsn_code = item.hsn_code
    
    def serial_no_case(self):
        if self.chassis_no:
            self.chassis_no = self.chassis_no.upper().strip()
        if self.battery_no:
            self.battery_no = self.battery_no.upper().strip()
        if self.charger_no:
            self.charger_no = self.charger_no.upper().strip()
        if self.motor_no:
            self.motor_no = self.motor_no.upper().strip()
        if self.controller_no:
            self.controller_no = self.controller_no.upper().strip()

        
            
