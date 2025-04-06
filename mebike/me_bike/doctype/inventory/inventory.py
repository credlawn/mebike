import frappe
from frappe.model.document import Document
from frappe import _

class Inventory(Document):
    def validate(self):

        if not (self.in_quantity or self.out_quantity):
            frappe.throw(_("Either In Quantity or Out Quantity must be provided"))
            
        if self.in_quantity and self.out_quantity:
            frappe.throw(_("Cannot have both In Quantity and Out Quantity in the same record"))
            
        if self.in_quantity and self.in_quantity < 0:
            frappe.throw(_("In Quantity cannot be negative"))
            
        if self.out_quantity and self.out_quantity < 0:
            frappe.throw(_("Out Quantity cannot be negative"))
            
        if self.rate and self.rate < 0:
            frappe.throw(_("Rate cannot be negative"))
    
    def before_insert(self):
        self.autoname()
        
    def after_insert(self):
        
        self.set_warehouse()
        self.reload()
        
    def autoname(self):
        
        last_doc = frappe.get_all('Inventory', 
                                fields=['name'], 
                                order_by="creation desc", 
                                limit=1)
        
        if last_doc:
            last_name = last_doc[0].name
            letters = last_name[:2]
            number = int(last_name[2:])
            
            if number < 999:
                new_number = number + 1
                new_letters = letters
            else:
                new_number = 1
                if letters[1] < 'Z':
                    new_letters = letters[0] + chr(ord(letters[1]) + 1)
                else:
                    new_letters = chr(ord(letters[0]) + 1) + 'A'
        else:
            new_letters = 'AA'
            new_number = 1
        
        new_number_str = f"{new_number:03d}"
        self.name = f"{new_letters}{new_number_str}"
        
    def set_warehouse(self):
        
        warehouse = frappe.get_value(
            "Warehouse",
            filters={"partner_code": self.partner_code},
            fieldname=["name", "warehouse_code", "warehouse_name"],
            as_dict=True
        )
        
        if not warehouse:
            frappe.throw(_("Warehouse not found for partner code: {0}").format(self.partner_code))
            return
        
        frappe.db.set_value("Inventory", self.name, {
            "warehouse_code": warehouse.warehouse_code,
            "warehouse_name": warehouse.warehouse_name
        })
        
        warehouse_doc = frappe.get_doc("Warehouse", warehouse.name)
        item_found = False
        
        for item in warehouse_doc.get("warehouse_items", []):
            if item.item_code == self.item_code:
                item_found = True
                
                current_qty = item.quantity or 0
                in_qty = self.in_quantity or 0
                out_qty = self.out_quantity or 0
                new_quantity = current_qty + in_qty - out_qty
                
                if new_quantity < 0:
                    frappe.throw(_("Insufficient stock for item {0}. Available: {1}, Trying to remove: {2}")
                                .format(self.item_code, current_qty, out_qty))
                
                item.quantity = new_quantity
                if self.rate is not None:
                    item.rate = self.rate
                break
        
        if not item_found:
            initial_quantity = (self.in_quantity or 0) - (self.out_quantity or 0)
            
            if initial_quantity < 0:
                frappe.throw(_("Cannot create item with negative initial quantity"))
            
            warehouse_doc.append("warehouse_items", {
                "item_code": self.item_code,
                "item_name": self.item_name,
                "quantity": initial_quantity,
                "rate": self.rate if self.rate is not None else 0
            })
        
        warehouse_doc.save()
        frappe.db.commit()