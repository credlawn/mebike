import frappe
from frappe import _

@frappe.whitelist()
def create_inventory_from_invoice(purchase_doc_name):
    try:
        purchase_doc = frappe.get_doc("Purchase", purchase_doc_name)
        
        if purchase_doc.status == "Stock Delivered":
            frappe.throw(_("Stock already Delivered!"))
        
        for item in purchase_doc.items:
            inventory = frappe.new_doc("Inventory")
            inventory.update({
                "item_code": item.item_code,
                "item_name": item.item_name,
                "in_quantity": item.quantity,
                "rate": item.rate,
                "amount": item.amount,

                "invoice_no": purchase_doc.invoice_no,
                "invoice_date": purchase_doc.invoice_date,
                "partner_code": purchase_doc.partner_code,
                "partner_name": purchase_doc.partner_name,
            })
            inventory.insert()
        
        frappe.db.set_value("Purchase", purchase_doc_name, "status", "Stock Delivered")
        frappe.db.commit()
        
        return {"success": True, "message": _("Stock Delivered successfully!")}
    
    except Exception as e:
        frappe.db.rollback()
        frappe.log_error(_("Failed to receive stock"), e)
        return {"success": False, "message": _("Error: {0}").format(str(e))}