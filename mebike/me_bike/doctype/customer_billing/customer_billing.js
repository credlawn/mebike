// Helper function to toggle visibility of bike-related fields
function toggleBikeFields(frm) {
    const bikeFields = ['chassis_no', 'controller_no', 'motor_no', 'battery_no', 'charger_no'];

    // First, hide all fields to handle cases where the item is changed from a bike to a non-bike
    bikeFields.forEach(field => {
        frm.set_df_property(field, 'hidden', 1);
    });

    if (frm.doc.select_item) {
        frappe.db.get_doc('Item', frm.doc.select_item).then(item => {
            if (["Bike", "Scooter"].includes(item.item_sub_category)) {
                // If it's a Bike or Scooter, show the fields
                bikeFields.forEach(field => {
                    frm.set_df_property(field, 'hidden', 0);
                });
            }
        });
    }
}

// Helper function to show a success message for downloads
const showDownloadPopup = () => {
    // Create the main container for the toast
    const toastContainer = document.createElement('div');

    const popupHTML = `<div style="background-color: #ffffff; border-radius: 12px; padding: 16px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1); border: 1px solid #f0f0f0; max-width: 380px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;">
        <div style="display: flex; align-items: center;">
            <div style="flex-shrink: 0; background-color: #e7f5ec; width: 36px; height: 36px; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin-right: 16px;">
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M16.6668 5L7.50016 14.1667L3.3335 10" stroke="#10B981" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
            </div>
            <div>
                <h3 style="margin: 0; font-size: 15px; font-weight: 600; color: #1f2937;">Download Started</h3>
                <p style="margin: 2px 0 0; font-size: 14px; color: #6b7280;">Your file will be available in a moment.</p>
            </div>
        </div>
    </div>`;

    toastContainer.innerHTML = popupHTML;

    // Style the container to be a "toast" notification
    toastContainer.style.position = 'fixed';
    toastContainer.style.left = '50%';
    toastContainer.style.transform = 'translateX(-50%)';
    toastContainer.style.top = '0px'; // Start above the final position
    toastContainer.style.zIndex = '10000'; // Higher z-index
    toastContainer.style.opacity = '0';
    toastContainer.style.transition = 'opacity 0.5s ease-in-out, top 0.5s ease-in-out';

    // Append to body
    document.body.appendChild(toastContainer);

    // Trigger fade-in and slide-down animation
    setTimeout(() => {
        toastContainer.style.opacity = '1';
        toastContainer.style.top = '20px'; // Slide to final position
    }, 10);

    // Set a timer to fade out and remove the toast
    setTimeout(() => {
        toastContainer.style.opacity = '0';
        toastContainer.style.top = '0px'; // Slide back up
        setTimeout(() => {
            if (document.body.contains(toastContainer)) {
                document.body.removeChild(toastContainer);
            }
        }, 500); // Match transition duration
    }, 4000); // Keep the toast on screen for 4 seconds
};

// Helper function to trigger file download
const downloadFile = (url, filename) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showDownloadPopup();
};

function updatePricing(frm) {
    const quantity = parseFloat(frm.doc.quantity) || 0;
    const selling_price = parseFloat(frm.doc.selling_price) || 0;
    const default_mrp = parseFloat(frm.doc.default_mrp) || 0;
    const default_sub_total = parseFloat(frm.doc.default_sub_total) || 0;
    const gst_slab = parseFloat(frm.doc.gst_slab) || 0;
    const discount_type = frm.doc.discount_type;
    const discount_per = parseFloat(frm.doc.discount_per) || 0;
    const discount_amount = parseFloat(frm.doc.discount_amount) || 0;

    if (!frm.doc.select_item) {
        const fields_to_zero = [
            'sub_total', 'mrp', 'taxable_value', 'taxes_and_charges', 'grand_total',
            'rounded_total', 'total_saving', 'discount', 'weight', 'gst_slab'
        ];
        fields_to_zero.forEach(f => frm.set_value(f, 0));
        return;
    }

    if (selling_price > 0 && selling_price < default_mrp) {
        frm.set_value('selling_price', 0);
        frappe.throw({
            title: __("Invalid Selling Price"),
            message: __("Selling Price Can not be less than On Road Price. Use Discount Instead.")
        });
        return;
    }

    let base_price_per_unit = default_sub_total;
    if (selling_price > 0) {
        const gst_divisor = 1 + (gst_slab / 100);
        base_price_per_unit = selling_price / gst_divisor;
    }

    const total_base_price = base_price_per_unit * quantity;

    let total_discount = 0;
    if (discount_type === "Percentage") {
        total_discount = (total_base_price * discount_per) / 100;
    } else if (discount_type === "Fixed Amount") {
        const gst_divisor = 1 + (gst_slab / 100);
        total_discount = discount_amount / gst_divisor;
    }

    const taxable_value = total_base_price - total_discount;
    const taxes_and_charges = taxable_value * (gst_slab / 100);
    const grand_total = taxable_value + taxes_and_charges;
    const rounded_total = Math.round(grand_total);

    const mrp_for_saving = (selling_price > 0 ? selling_price : default_mrp) * quantity;
    const total_saving = mrp_for_saving - rounded_total;

    frm.set_value('sub_total', total_base_price);
    frm.set_value('discount', total_discount);
    frm.set_value('taxable_value', taxable_value);
    frm.set_value('taxes_and_charges', taxes_and_charges);
    frm.set_value('grand_total', grand_total);
    frm.set_value('rounded_total', rounded_total);
    frm.set_value('mrp', (selling_price > 0 ? selling_price : default_mrp));
    frm.set_value('total_saving', total_saving);
}

function unlockDetailsFields(frm) {
    const fields_to_unlock = ['customer_name', 'mobile_no', 'email', 'city', 'state', 'address', 'pincode', 'discount_type', 'discount_per',
        'discount_amount', 'invoice_date', 'select_item', 'chassis_no', 'motor_no', 'battery_no', 'charger_no', 'controller_no',
        'filter_by_sub_category', 'quantity'
    ];
    fields_to_unlock.forEach(field => {
        frm.set_df_property(field, 'read_only', false);
    });
}

function set_select_item_query(frm) {
    frm.fields_dict['select_item'].get_query = () => {
        return frm.doc.filter_by_sub_category ? {
            filters: { item_sub_category: frm.doc.filter_by_sub_category }
        } : {};
    };
}


frappe.ui.form.on('Customer Billing', {
    on_submit: function(frm) {
        setTimeout(function() {
            if(frm.doc.invoice_no && frm.doc.invoice_no !== frm.doc.name) {
                window.location.href = `/app/customer-billing/${frm.doc.invoice_no}`;
            }
        }, 1000);
    },

    validate: function(frm) {
        // Logic moved to refresh event for better consistency
    },
    
    onload: function(frm) {
        const allBikeFields = ['chassis_no', 'controller_no', 'motor_no', 'battery_no', 'charger_no', 'spare_battery_no'];

        allBikeFields.forEach(field => {
            frm.set_df_property(field, 'hidden', 1);
            frm.set_df_property(field, 'read_only', 0);
        });

        toggleBikeFields(frm);

        frm.toggle_display('filter_by_sub_category', !frm.is_new());
        frm.toggle_display('e', !frm.is_new());

        if (frm.doc.docstatus === 1) {
            frm.toggle_display('reference_no', false);
        }

        frm.refresh_fields(allBikeFields.concat(['filter_by_sub_category', 'e', 'reference_no']));
    },

    refresh: function(frm) {
        // This logic was moved from the 'validate' event. It makes fields read-only if they have a value.
        const bikeFields = ['chassis_no', 'controller_no', 'motor_no', 'battery_no', 'charger_no'];
        bikeFields.forEach(field => {
            if (frm.doc[field]) {
                frm.set_df_property(field, 'read_only', 1);
            }
        });

        if (!frm.is_new()) {
            const fields_to_control = ['customer_name', 'mobile_no', 'email', 'city', 'state', 'address', 'pincode',
                 'invoice_date', 'select_item', 'chassis_no', 'motor_no', 'battery_no', 'charger_no', 'controller_no',
                'filter_by_sub_category'
            ];
            fields_to_control.forEach(field => {
                const value = frm.doc[field];
                frm.set_df_property(field, 'read_only', !!value);
            });
            if (![1, 2].includes(frm.doc.docstatus)) {
                frm.add_custom_button(__('Edit Details'), function() {
                    unlockDetailsFields(frm);
                    frm.remove_custom_button('Download Quotation');
                });
                $("button[data-label='Edit%20Details']").removeClass("btn-default").addClass("manns_green_button");
            }
            
            frm.toggle_display('filter_by_sub_category', true);
            frm.set_df_property('filter_by_sub_category', 'reqd', true);

            frm.toggle_display('e', true);
            frm.set_df_property('e', 'reqd', false);
        }
        if (frm.doc.docstatus === 1) {
            frm.toggle_display('reference_no', false);
        }

        if (frm.doc.docstatus === 1) {
            frm.add_custom_button(__('Download Invoice'), function () {
                const doc_name = frm.doc.name;
                const url = `/api/method/frappe.utils.print_format.download_pdf?doctype=${encodeURIComponent('Customer Billing')}&name=${encodeURIComponent(doc_name)}&format=${encodeURIComponent('Customer Invoice')}&no_letterhead=0&letterhead=mebike&settings=%7B%7D&_lang=en`;
                downloadFile(url, `${doc_name}.pdf`);
            });

            setTimeout(() => {
                $("button[data-label='Download%20Invoice']").removeClass("btn-default").addClass("manns_green_button");
            }, 0);
        }

        if (frm.doc.docstatus === 0 && !frm.is_new() && frm.doc.select_item) {
            frm.add_custom_button(__('Download Quotation'), function () {
                const doc_name = frm.doc.name;
                const url = `/api/method/frappe.utils.print_format.download_pdf?doctype=${encodeURIComponent('Customer Billing')}&name=${encodeURIComponent(doc_name)}&format=${encodeURIComponent('Customer Invoice')}&no_letterhead=0&letterhead=mebike&settings=%7B%7D&_lang=en`;
                downloadFile(url, `${doc_name}.pdf`);
            });

            setTimeout(() => {
                $("button[data-label='Download%20Quotation']").removeClass("btn-default").addClass("manns_blue_button");
            }, 0);
        }
    },

    partner_code: function(frm) {
        if (!frm.doc.partner_code) {
            frm.toggle_display('a', false);
            frappe.throw("Your Account is disabled for Security reasons. Please Contact your Manager");
        } else {
            frm.toggle_display('a', true);
            frm.toggle_display('abc', true);
            frm.toggle_display('c', true);
            frm.toggle_display('d', true);
        }
    },

    filter_by_sub_category: function(frm) {
        frm.set_value('select_item', '');
        set_select_item_query(frm);
    },

    select_item: function(frm) {
        const fields_to_clear = [
            'item_name', 'item_color', 'model_name', 'item_type', 'details', 'chassis_no',
            'controller_no', 'motor_no', 'battery_no', 'charger_no', 'selling_price',
            'mrp', 'default_mrp', 'hsn_code', 'weight', 'sub_total', 'default_sub_total',
            'discount', 'gst_slab', 'taxable_value', 'taxes_and_charges', 'grand_total',
            'rounded_total', 'total_saving'
        ];
        fields_to_clear.forEach(f => frm.set_value(f, null));
        frm.set_value('quantity', 1);
        frm.set_value('discount_type', 'No Discount');
        frm.set_value('discount_per', 0);
        frm.set_value('discount_amount', 0);

        // Toggle bike fields visibility based on the new item (or lack thereof)
        toggleBikeFields(frm);

        if (!frm.doc.select_item) {
            updatePricing(frm);
            return;
        }

        frappe.db.get_doc('Item', frm.doc.select_item).then(item => {
            frm.set_value('item_name', item.item_name);
            frm.set_value('item_color', item.item_color);
            frm.set_value('model_name', item.model);
            frm.set_value('item_type', item.item_sub_category);
            frm.set_value('hsn_code', item.hsn_code);
            frm.set_value('weight', item.item_weight);
            frm.set_value('gst_slab', item.tbi_gst_slab);
            
            frm.set_value('sub_total', item.customer_price_pre_gst);
            frm.set_value('default_sub_total', item.customer_price_pre_gst);
            frm.set_value('mrp', item.item_mrp);
            frm.set_value('default_mrp', item.item_mrp);

            updatePricing(frm);
        });
    },

    quantity: function(frm) {
        updatePricing(frm);
    },
    selling_price: function(frm) {
        updatePricing(frm);
    },
    discount_type: function(frm) {
        if (frm.doc.discount_type === "Percentage") {
            frm.set_value('discount_amount', 0);
        } else if (frm.doc.discount_type === "Fixed Amount") {
            frm.set_value('discount_per', 0);
        }
        updatePricing(frm);
    },
    discount_per: function(frm) {
        updatePricing(frm);
    },
    discount_amount: function(frm) {
        updatePricing(frm);
    }
});