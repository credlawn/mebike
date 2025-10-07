# Copyright (c) 2025, Manns Group and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document


class Warehouse(Document):
    def validate(self):
        self.set_warehouse_code()
        self.calculate_item_amount()
        
    def on_update(self):
        self.set_warehouse_owner()
        
    def before_insert(self):
        self.autoname()
        
        
    def set_warehouse_code(self):
        self.warehouse_code = self.name
        
    def set_warehouse_owner(self):
        frappe.db.set_value('Warehouse', self.name, 'owner', self.email)
        frappe.db.commit()
    
    def autoname(self):
        last_doc = frappe.get_all('Warehouse', filters={'name': ['like', 'WH%']}, fields=['name'], order_by='name desc', limit=1)
        new_number = int(last_doc[0].name[2:]) + 1 if last_doc else 1
        if new_number > 999: frappe.throw("Maximum inventory items (PA999) reached")
        
        self.name = f"WH{new_number:03d}"
        
    def calculate_item_amount(self):
        warehouse_items = self.get("warehouse_items")
        total_quantity = 0
        total_amount = 0
        
        if warehouse_items:
            for item in warehouse_items:
                if item.rate and item.quantity:
                    item.amount = item.rate * item.quantity
                else:
                    item.amount = 0
                    
                total_quantity += item.quantity
                total_amount += item.amount
                
        self.total_stock_quantity = total_quantity
        self.total_stock_amount = total_amount
        

