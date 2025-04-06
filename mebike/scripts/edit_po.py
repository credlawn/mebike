import frappe
from frappe.model.document import Document

@frappe.whitelist()
def enable_edit_po_option(purchase_doc_name):
    purchase_doc = frappe.get_doc('Purchase', purchase_doc_name)
    
    frappe.db.set_value('Purchase', purchase_doc_name, 'docstatus', '0')
    frappe.db.set_value('Purchase', purchase_doc_name, 'status', 'Ready for Billing')
    frappe.db.commit()

    

