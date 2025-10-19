import frappe
from frappe.model.document import Document
from datetime import datetime

class CustomerBilling(Document):
    def validate(self):
        self.calculate_pricing()
        self.change_text_casing()
        
    def before_insert(self):
        self.set_owner()
        self.autoname()
        
    def autoname(self):
        self.name = self.generate_temp_name()
        self.reference_no = self.name

    def on_submit(self):
        self.check_stock()
        self.check_stock_serial()
        self.create_inventory()
        self.delete_zero_stock()
        
        new_name = self.generate_final_name()
        
        self.invoice_no = new_name
        frappe.db.set_value(self.doctype, self.name, "invoice_no", new_name)
        
        if not self.customer_id:
            self.set_customer_id()
            frappe.db.set_value(self.doctype, self.name, "customer_id", self.customer_id)
        
        frappe.db.commit()
        
        # Only attempt rename if the names are different
        if new_name != self.name:
            try:
                frappe.db.sql(f"""
                    UPDATE `tab{self.doctype}` 
                    SET name=%s 
                    WHERE name=%s
                """, (new_name, self.name))
                
                frappe.db.sql(f"""
                    UPDATE `tabDocType` 
                    SET autoname=%s 
                    WHERE name=%s
                """, (new_name, self.name))
                
                frappe.db.commit()
                frappe.response['redirect_to'] = f"/app/{frappe.scrub(self.doctype)}/{new_name}"
            except Exception as e:
                frappe.log_error(f"Failed to rename document: {str(e)}")
                
    def check_stock(self):
        if not self.select_item:
            return
        
        user_email = "billing@mebikeindia.com" if frappe.session.user == "Administrator" else frappe.session.user
        if user_email == "billing@mebikeindia.com":
            return
        
        warehouse = frappe.get_value("Warehouse", {"email": user_email}, "name")
        if not warehouse:
            return
        
        item_data = frappe.get_value("Warehouse Items",
                                     filters={   
                                        "parent": warehouse,
                                        "item_code": self.select_item
                                     },
                                     fieldname=["quantity", "rate"],
                                     as_dict=True)
        
        if not item_data or item_data.quantity is None:
            frappe.throw(f"""
                <b>Insufficient Stock</b><br><br>
                <b>Model:</b> {self.item_name}<br>
                <b>Available:</b> 0 <br>
                <b>Required:</b> {self.quantity}
            """)
            
        if item_data.quantity < self.quantity:
            frappe.throw(f"""
                <b>Insufficient Stock</b><br><br>
                <b>Model:</b> {self.item_name}<br>
                <b>Available:</b> {item_data.quantity}<br>
                <b>Required:</b> {self.quantity}
            """)
            
    def check_stock_serial(self):
        item = frappe.get_doc("Item", self.select_item)
        if item.item_sub_category in ["Bike", "Scooter"]:
            missing_fields = []
            if not self.chassis_no:
                missing_fields.append("Chassis No")
            if not self.motor_no:
                missing_fields.append("Motor No")
            if not self.battery_no:
                missing_fields.append("Battery No")
            if missing_fields:
                frappe.throw(("Missing required Details: {0}").format(", ".join(missing_fields)))
            

    def set_owner(self):
        user_email = "billing@mebikeindia.com" if frappe.session.user == "Administrator" else frappe.session.user
        partner_name = frappe.db.get_value("Partner", {"email": user_email}, "name")
        if partner_name:
            self.partner_code = partner_name
            self.partner_email = user_email
            self.owner = user_email
        else:
            frappe.throw(f"Your Partner Account is not Active. Please contact your Manager. ({user_email})")

    def generate_temp_name(self):
        prefix = self.get_financial_year()
        existing_codes = self.get_existing_codes(f"Ref/{prefix}/")
        next_code = self.get_next_code(existing_codes)
        return f"Ref/{prefix}/{next_code:04d}"

    def generate_final_name(self):
        prefix = self.get_financial_year()
        existing_codes = self.get_existing_codes(f"{self.partner_code}/{prefix}/", self.partner_code)
        next_code = self.get_next_code(existing_codes)
        return f"{self.partner_code}/{prefix}/{next_code:04d}"

    def get_financial_year(self):
        today = datetime.now()
        year = today.year
        month = today.month
        if month >= 4:
            start_year = year
            end_year = year + 1
        else:
            start_year = year - 1
            end_year = year
        return f"{start_year % 100:02d}-{end_year % 100:02d}"

    def get_existing_codes(self, prefix, partner_code=None):
        filters = {"name": ["like", prefix + "%"]}
        if partner_code:
            filters["partner_code"] = partner_code
        existing_codes = frappe.get_all(
            self.doctype,
            filters=filters,
            fields=["name"],
            order_by="name desc"
        )
        return existing_codes

    def get_next_code(self, existing_codes):
        if existing_codes:
            last_code = existing_codes[0]["name"]
            last_number = int(last_code.split("/")[-1])
            return last_number + 1
        return 1

    


    def calculate_pricing(self):
        if self.select_item:
            item_serial = frappe.db.get_value(
                'Item',
                self.select_item,
                [
                    'item_weight',
                    'item_name', 'item_color', 'model', 'item_sub_category',
                    'customer_price_pre_gst', 'tbi_gst_slab', 'item_mrp'
                ],
                as_dict=True
            )

            if item_serial:
                self.default_mrp = item_serial.item_mrp or 0
                if self.selling_price and self.selling_price < self.default_mrp:
                    frappe.throw("Selling Price Can not be less than On Road Price. Use Discount Instead.")

                self.item_name = item_serial.item_name or ''
                self.item_color = item_serial.item_color or ''
                self.model_name = item_serial.model or ''
                self.item_type = item_serial.item_sub_category or ''
                self.quantity = float(self.quantity or 1)
                self.weight = (item_serial.item_weight or 0) * self.quantity
                self.gst_slab = item_serial.tbi_gst_slab or 0
                
                default_sub_total_per_unit = item_serial.customer_price_pre_gst or 0

                base_price_per_unit = default_sub_total_per_unit
                if self.selling_price and self.selling_price > 0:
                    gst_divisor = 1 + (float(self.gst_slab) / 100)
                    base_price_per_unit = float(self.selling_price) / gst_divisor
                
                total_base_price = base_price_per_unit * self.quantity

                discount = 0
                if self.discount_type == "Percentage":
                    if float(self.discount_per or 0) > 0:
                        discount = (total_base_price * float(self.discount_per)) / 100
                elif self.discount_type == "Fixed Amount":
                    if float(self.discount_amount or 0) > 0:
                        gst_divisor = 1 + (float(self.gst_slab) / 100)
                        discount = float(self.discount_amount) / gst_divisor
                
                taxable_value = total_base_price - discount
                taxes_and_charges = taxable_value * (float(self.gst_slab) / 100)
                grand_total = taxable_value + taxes_and_charges
                rounded_total = round(grand_total)

                mrp_for_saving = (self.selling_price or self.default_mrp) * self.quantity
                total_saving = mrp_for_saving - rounded_total

                self.rate = base_price_per_unit
                self.sub_total = total_base_price
                self.discount = discount
                self.taxable_value = taxable_value
                self.taxes_and_charges = taxes_and_charges
                self.grand_total = grand_total
                self.rounded_total = rounded_total
                self.mrp = self.selling_price or self.default_mrp
                self.total_saving = total_saving
                
                self.igst = taxes_and_charges
                self.sgst = taxes_and_charges / 2
                self.cgst = taxes_and_charges / 2


    def change_text_casing(self):
        
        self.customer_name = self.customer_name.title().strip()
        self.city = self.city.title().strip()
        
        if self.email:
            self.email = self.email.lower().strip()
        
        if not (self.mobile_no and len(self.mobile_no) == 10 and self.mobile_no.isdigit()):
            frappe.throw("Please enter correct mobile no")
            
        if self.chassis_no:
            self.chassis_no = self.chassis_no.upper().strip()
            
        if self.motor_no:
            self.motor_no = self.motor_no.upper().strip()
            
        if self.battery_no:
            self.battery_no = self.battery_no.upper().strip()
            
        if self.charger_no:
            self.charger_no = self.charger_no.upper().strip()
            
        if self.controller_no:
            self.controller_no = self.controller_no.upper().strip()
            
            
    def set_customer_id(self):
        
        existing_customer_id = frappe.db.get_value(
            self.doctype,
            {"mobile_no": self.mobile_no, "name": ["!=", self.name]},
            "customer_id"
        )
        if existing_customer_id:
            self.customer_id = existing_customer_id
        else:
            last_customer = frappe.db.get_value(
                self.doctype,
                filters={"customer_id": ["like", "MECU%"]},
                fieldname="customer_id",
                order_by="customer_id desc"
            )
            if last_customer:
                last_number = int(last_customer[4:])
                new_number = last_number + 1
            else:
                new_number = 1
            
            self.customer_id = f"MECU{new_number:04d}"
        
        
    def create_inventory(self):
        
        user_email = "billing@mebikeindia.com" if frappe.session.user == "Administrator" else frappe.session.user
        
        warehouse_list = frappe.get_all(
            "Warehouse", 
            filters={"email": user_email}, 
            fields=["partner_code", "partner_name"], 
            ignore_permissions=True
        )

        if not warehouse_list:
            return
        
        warehouse = warehouse_list[0]

        item_list = frappe.get_all(
            "Item", 
            filters={"name": self.select_item}, 
            fields=["partner_price_before_gst"], 
            ignore_permissions=True
        )

        if not item_list:
            return
        item = item_list[0]
        
        amount = self.quantity * item.partner_price_before_gst
        
        inventory = frappe.get_doc({
            "doctype": "Inventory",
            "item_code": self.select_item,
            "item_name": self.item_name,
            "out_quantity": self.quantity,
            "rate": item.partner_price_before_gst,
            "amount": amount,
            "invoice_no": self.invoice_no,
            "invoice_date": self.invoice_date,
            "partner_code": warehouse.partner_code,
            "partner_name": warehouse.partner_name
        })

        inventory.insert(ignore_permissions=True)
        
    def delete_zero_stock(self):
        user_email = "billing@mebikeindia.com" if frappe.session.user == "Administrator" else frappe.session.user
        warehouse = frappe.get_value("Warehouse", {"email": user_email}, "name")
        
        frappe.db.sql("""
            DELETE FROM `tabWarehouse Items`
            WHERE parent = %s AND quantity = 0
        """, warehouse)
        
        frappe.db.commit()
        
            
        


            
        