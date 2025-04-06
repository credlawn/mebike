import frappe

@frappe.whitelist()
def refresh_available_credit_limit(docname):
    purchase_doc = frappe.get_doc("Purchase", docname)
    credit_limit = frappe.db.get_value("Partner Books", {"partner_code": purchase_doc.partner_code}, "available_credit_limit")
    
    frappe.db.set_value("Purchase", purchase_doc.name, "available_credit_limit", credit_limit)
    frappe.db.commit()

    formatted_credit_limit = frappe.format_value(credit_limit, {"fieldtype": "Currency"})
    return formatted_credit_limit
