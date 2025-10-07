import frappe
from frappe.model.document import Document

class SubdealerBilling(Document):
    def validate(self):
        self.set_party_details()
        
        self.other_calculation()
        self.calculate_cat_gst() 
        
    def after_insert(self):
        self.set_sharing()
        
    def set_party_details(self):
        if not self.partner_code:
            frappe.throw("Dealer Code is required to Comntinue Billing")
            
        user_email = "billing@mebikeindia.com" if frappe.session.user in ("Administrator", "billing@mebikeindia.com") else frappe.session.user
        tp = frappe.get_doc('Partner', self.partner_code)
        fp = frappe.get_doc("Partner", {"email": user_email})
        if user_email != "billing@mebikeindia.com":
            self.from_party_name = fp.business_name
            self.bill_from_address = fp.business_address
            self.from_gst_no = fp.gst_no
            self.from_state = fp.state
            self.from_state_code = fp.state_code
            self.from_city = fp.city
            self.from_pincode = fp.pincode
            self.from_landmark = fp.landmark
            self.from_partner_email = fp.email
    
            self.to_party_name = tp.business_name
            self.to_gst_no = tp.gst_no
            self.bill_to_address = tp.business_address
            self.to_state = tp.state
            self.to_state_code = tp.state_code
            self.to_city = tp.city
            self.to_pincode = tp.pincode
            self.to_landmark = tp.landmark
            self.to_partner_email = tp.email
            self.partner_name = tp.business_name
            
            if not tp.has_different_shipping_address:
                self.ship_to_party_name = tp.business_name
                self.ship_to_address = tp.business_address
                self.ship_to_state = tp.state
                self.ship_to_state_code = tp.state_code
                self.ship_to_city = tp.city
                self.ship_to_pincode = tp.pincode
                self.ship_to_landmark = tp.landmark
                self.ship_to_gst_no = tp.gst_no
            else:
                self.ship_to_party_name = tp.s_business_name
                self.ship_to_address = tp.shipping_address
                self.ship_to_state = tp.s_state
                self.ship_to_state_code = tp.s_state_code
                self.ship_to_city = tp.s_city
                self.ship_to_pincode = tp.s_pincode
                self.ship_to_landmark = tp.s_landmark
                self.ship_to_gst_no = tp.s_gst_no
            
    def set_sharing(self):
        if self.name and self.to_partner_email:
            existing_share = frappe.db.exists('DocShare', {'share_doctype': 'Subdealer Billing', 'share_name': self.name, 'user': self.to_partner_email})
            if existing_share:
                frappe.share.remove("Subdealer Billing", self.name, self.to_partner_email)
            frappe.share.add("Subdealer Billing", self.name, self.to_partner_email, read=1)
            frappe.db.set_value("DocShare", {"share_doctype": "Subdealer Billing", "share_name": self.name, "user": self.to_partner_email}, "notify_by_email", 0)
            frappe.db.commit()

            
    def other_calculation(self):
        if not self.other_charges:
            other_charges = 0
        else:
            other_charges = self.other_charges
            
        self.amount_with_charges = self.sub_total + self.total_taxes_and_charges + other_charges
        
    def calculate_cat_gst(self):
        gst_amount = self.total_taxes_and_charges
        
        if self.from_state_code != self.to_state_code:
            self.igst_amount = gst_amount
            self.sgst_amount = 0
            self.cgst_amount = 0
        else:
            self.cgst_amount = gst_amount / 2
            self.sgst_amount = gst_amount / 2
            self.igst_amount = 0
        
            

        
