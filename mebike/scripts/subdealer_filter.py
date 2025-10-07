import frappe
from frappe import _

@frappe.whitelist()
def get_item_quantity_for_user(item_code):
    user = frappe.session.user
    # Query total quantity for the item_code where owner = current user from Warehouse Items child doctype
    quantity = frappe.db.sql("""
        SELECT SUM(quantity) 
        FROM `tabWarehouse Items`
        WHERE owner=%s AND item_code=%s
    """, (user, item_code), as_list=True)

    total_qty = quantity[0][0] if quantity and quantity[0][0] else 0

    return total_qty
