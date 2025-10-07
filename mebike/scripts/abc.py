import frappe
from frappe.model.document import Document

@frappe.whitelist()
def pdf(name):
    pdf_url = frappe.utils.print_format.download_pdf(
        doctype="Invoice",
        name=name,
        format="Invoice",  
        print_format="Invoice" 
    )
    return pdf_url

@frappe.whitelist()
def download_invoice_pdf(name):
    # Generate and return PDF download URL
    pdf_url = frappe.utils.print_format.download_pdf(
        doctype="Invoice",
        name=name,
        format="Standard",
        print_format="Invoice"
    )
    return {
        'pdf_url': pdf_url
    }
