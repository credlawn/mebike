import frappe
import pandas as pd
import io
import traceback
from frappe.utils.file_manager import get_file
from frappe.model.document import Document

def read_excel_file(file_url):
    file_doc, file_content = get_file(file_url)
    file_bytes = io.BytesIO(file_content)
    df = pd.read_excel(file_bytes, engine="openpyxl")
    df.columns = [col.strip().lower() for col in df.columns]
    return df

class MannsPurchase(Document):

    def after_save(self):
        if not self.attach_item_excel:
            return

        try:
            df = read_excel_file(self.attach_item_excel)

            total_weight = 0
            total_price = 0
            total_quantity = 0
            gst = 0
            grand_total = 0

            for _, row in df.iterrows():
                if row.isnull().all():
                    continue

                total_weight += float(row.get("weight", 0) or 0)
                total_price += float(row.get("price", 0) or 0)
                total_quantity += 1
                gst += float(row.get("gst", 0) or 0)
                grand_total += float(row.get("total", 0) or 0)

            frappe.db.set_value("Manns Purchase", self.name, "total_weight", total_weight)
            frappe.db.set_value("Manns Purchase", self.name, "sub_total", total_price)
            frappe.db.set_value("Manns Purchase", self.name, "total_quantity", total_quantity)
            frappe.db.set_value("Manns Purchase", self.name, "total_taxes_and_charges", gst)
            frappe.db.set_value("Manns Purchase", self.name, "grand_total", grand_total)
            frappe.db.commit()
            self.reload()

        except Exception:
            frappe.throw(
                f"Failed to calculate totals:<br><pre>{frappe.utils.cstr(traceback.format_exc())}</pre>"
            )

    def on_submit(self):
        if not self.attach_item_excel:
            return

        try:
            df = read_excel_file(self.attach_item_excel)

            for _, row in df.iterrows():
                if row.isnull().all():
                    continue

                frappe.get_doc({
                    "doctype": "Item Serial",
                    "match_code": row.get("match code"),
                    "battery_no": row.get("battery"),
                    "charger_no": row.get("charger"),
                    "chassis_no": row.get("chassis"),
                    "controller_no": row.get("controller"),
                    "motor_no": row.get("motor"),
                    "supplier": self.supplier,
                    "manns_invoice_no": self.invoice_no,
                    "manns_purchase_date": self.invoice_date,
                }).insert()

        except Exception:
            frappe.throw(
                f"Failed to create Item Serial records:<br><pre>{frappe.utils.cstr(traceback.format_exc())}</pre>"
            )
