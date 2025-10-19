import frappe
from frappe.model.document import Document

@frappe.whitelist()
def create_invoice_from_purchase(purchase_doc_name):
    # Fetch the purchase document
    purchase_doc = frappe.get_doc('Purchase', purchase_doc_name)
    
    # Create a new Sales Invoice
    invoice_doc = frappe.new_doc('Invoice')
    invoice_doc.invoice_type = "Purchase Invoice"
    invoice_doc.partner_code = purchase_doc.partner_code
    invoice_doc.partner_name = purchase_doc.partner_name
    invoice_doc.billed_quantity = purchase_doc.total_quantity
    invoice_doc.invoice_amount = purchase_doc.sub_total
    invoice_doc.total_gst_amount = purchase_doc.total_taxes_and_charges
    invoice_doc.total_weight = purchase_doc.total_weight
    invoice_doc.amount_as_per_dp = purchase_doc.amount_as_per_dp
    invoice_doc.total_discount = purchase_doc.total_discount
    invoice_doc.pre_discount_taxable_value = purchase_doc.pre_discount_taxable_value
    
    # Add items from the purchase document to the invoice
    for item in purchase_doc.items:
        invoice_item = invoice_doc.append('items')
        invoice_item.item_code = item.item_code
        invoice_item.item_name = item.item_name
        invoice_item.quantity = item.quantity
        invoice_item.rate = item.rate
        invoice_item.amount = item.amount
        invoice_item.item_weight = item.item_weight
        invoice_item.item_gst = item.item_gst
        invoice_item.item_mrp = item.item_mrp
        invoice_item.hsn_code = item.hsn_code
        invoice_item.item_gst_slab = item.item_gst_slab
        invoice_item.discount = item.discount
        invoice_item.non_discounted_amount = item.non_discounted_amount
        

    # Insert the invoice into the database
    invoice_doc.insert()  

    frappe.db.set_value('Purchase', purchase_doc_name, {
        'status': 'Stock in Transit',
        'invoice_no': invoice_doc.invoice_no, 
        'invoice_date': invoice_doc.invoice_date
    })
    

    frappe.db.commit()

    return invoice_doc.name
