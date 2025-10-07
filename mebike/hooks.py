# -*- coding: utf-8 -*-
from __future__ import unicode_literals
from frappe import _

app_name = "mebike"
app_title = "Me Bike"
app_publisher = "Manns Group"
app_description = "Me Bike Billing Solutions"
app_email = "info@mebikeindia.com"
app_license = "gpl-3.0"

# Include assets
app_include_css = [
    "/assets/mebike/css/mebike.css"
]

app_include_js = [
    "/assets/mebike/js/mebike.js"  # Your conditional loading logic
]

# List View Settings
def listview_settings():
    return {
        "Customer Billing": {
            "fields": ["docstatus"],
            "add_fields": ["status"],
            "filters": [["docstatus", "!=", 2]]
        }
    }

# Required for proper initialization
