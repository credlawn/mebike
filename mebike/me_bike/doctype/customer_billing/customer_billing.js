frappe.ui.form.on('Customer Billing', {
    on_submit: function(frm) {
        setTimeout(function() {
            if(frm.doc.invoice_no && frm.doc.invoice_no !== frm.doc.name) {
                window.location.href = `/app/customer-billing/${frm.doc.invoice_no}`;
            }
        }, 1000);
    },

    validate: function(frm) {
        const bikeFields = ['chassis_no', 'controller_no', 'motor_no', 'battery_no', 'charger_no'];
        bikeFields.forEach(field => {
            if (frm.doc[field]) {
                frm.set_df_property(field, 'read_only', 1);
            }
        });
    },
    
    onload: function(frm) {
        const bikeFields = ['chassis_no', 'controller_no', 'motor_no', 'battery_no', 'charger_no'];
        const allBikeFields = [...bikeFields, 'spare_battery_no'];

        allBikeFields.forEach(field => {
            frm.set_df_property(field, 'hidden', 1);
            frm.set_df_property(field, 'read_only', 0);
        });

        if (frm.doc.select_item) {
            frappe.db.get_doc('Item', frm.doc.select_item).then(item => {
                if (["Bike", "Scooter"].includes(item.item_sub_category)) {
                    bikeFields.forEach(field => {
                        frm.set_df_property(field, 'hidden', 0);
                        frm.set_df_property(field, 'read_only', 0);
                    });
                    frm.refresh_fields(bikeFields);
                }
            });
        }

        frm.toggle_display('filter_by_sub_category', !frm.is_new());
        frm.toggle_display('e', !frm.is_new());

        if (frm.doc.docstatus === 1) {
            frm.toggle_display('reference_no', false);
        }

        frm.refresh_fields(allBikeFields.concat(['filter_by_sub_category', 'e', 'reference_no']));
    },

    

    refresh: function(frm) {

        if (!frm.is_new()) {
            const fields_to_control = ['customer_name', 'mobile_no', 'email', 'city', 'state', 'address', 'pincode', 'discount_type', 'discount_per',
                'discount_amount', 'invoice_date', 'quantity', 'select_item', 'chassis_no', 'motor_no', 'battery_no', 'charger_no', 'controller_no',
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

        const showDownloadPopup = () => {
            frappe.msgprint({
                title: __('Success'),
                message: `<div style="background-color:#ffffff;padding:24px;border-radius:8px;border-left:4px solid #ED3833;font-family:'Arial',sans-serif;box-shadow:0 4px 20px rgba(0,0,0,0.12);width:100%;box-sizing:border-box;">
                    <div style="display:flex;align-items:center;gap:14px;margin-bottom:16px;">
                        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M19 9H15V3H9V9H5L12 16L19 9Z" fill="#ED3833"/>
                            <path d="M5 20H19V18H5V20Z" fill="#ED3833"/>
                        </svg>
                        <span style="font-size:19px;font-weight:600;color:#212529;">Document Ready</span>
                    </div>
                    <p style="margin:0;font-size:16px;color:#495057;line-height:1.5;font-weight:500;">Your download will start automatically.</p>
                </div>`,
                indicator: 'green'
            });
        };

        const downloadFile = (url, filename) => {
            const link = document.createElement('a');
            link.href = url;
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            showDownloadPopup();
        };

        if (frm.doc.docstatus === 1) {
            frm.add_custom_button(__('Download Invoice'), function () {
                const doc_name = frm.doc.name;
                const url = `https://billing.mebikeindia.com/api/method/frappe.utils.print_format.download_pdf?doctype=${encodeURIComponent('Customer Billing')}&name=${encodeURIComponent(doc_name)}&format=${encodeURIComponent('Customer Invoice')}&no_letterhead=0&letterhead=mebike&settings=%7B%7D&_lang=en`;
                downloadFile(url, `${doc_name}.pdf`);
            });

            setTimeout(() => {
                $("button[data-label='Download%20Invoice']").removeClass("btn-default").addClass("manns_green_button");
            }, 0);
        }

        if (frm.doc.docstatus === 0 && !frm.is_new() && frm.doc.select_item) {
            frm.add_custom_button(__('Download Quotation'), function () {
                const doc_name = frm.doc.name;
                const url = `https://billing.mebikeindia.com/api/method/frappe.utils.print_format.download_pdf?doctype=${encodeURIComponent('Customer Billing')}&name=${encodeURIComponent(doc_name)}&format=${encodeURIComponent('Customer Invoice')}&no_letterhead=0&letterhead=mebike&settings=%7B%7D&_lang=en`;
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

    item_name: function(frm) {
        frm.toggle_display('d', true);
    },

    filter_by_sub_category: function(frm) {
        frm.set_value('select_item', '');
        set_select_item_query(frm);
    },

    select_item: function(frm) {
        ['chassis_no', 'controller_no', 'motor_no', 'battery_no', 'charger_no', 'item_name', 'item_color', 'model_name', 'item_type', 'details'].forEach(field => {
            frm.set_value(field, '');
        });
        ['mrp', 'hsn_code', 'weight', 'sub_total', 'discount', 'gst_slab', 'taxable_value', 'taxes_and_charges', 'grand_total', 'rounded_total', 'total_saving'].forEach(field => {
            frm.set_value(field, '0');
        });



        const bikeFields = ['chassis_no', 'controller_no', 'motor_no', 'battery_no', 'charger_no'];
        const allBikeFields = [...bikeFields, 'spare_battery_no'];
        allBikeFields.forEach(field => {
            frm.set_df_property(field, 'hidden', 1);
            frm.set_df_property(field, 'read_only', 0);
            frm.refresh_field(field);
        });

        if (!frm.doc.select_item) return;
        frappe.db.get_doc('Item', frm.doc.select_item).then(item => {
            if (["Bike", "Scooter"].includes(item.item_sub_category)) {
                bikeFields.forEach(field => {
                    frm.set_df_property(field, 'hidden', 0);
                    frm.set_df_property(field, 'read_only', 0);
                    frm.refresh_field(field);
                });
            }
        });



        
        set_select_item_query(frm);

        const isBikeOrScooter = ['Bike', 'Scooter'].includes(frm.doc.filter_by_sub_category) && frm.doc.select_item;
        ['chassis_no', 'battery_no', 'motor_no', 'charger_no', 'controller_no'].forEach(field => {
            const isRequired = [].includes(field) && isBikeOrScooter;
            frm.set_df_property(field, 'read_only', !isBikeOrScooter);
            frm.set_df_property(field, 'reqd', isRequired);
            frm.refresh_field(field);
        });

        const isMotor = ['Motor'].includes(frm.doc.filter_by_sub_category) && frm.doc.select_item;
        if (isMotor) {
            frm.set_df_property('motor_no', 'read_only', false);
            frm.set_df_property('motor_no', 'reqd', true);
            ['chassis_no', 'battery_no', 'charger_no', 'controller_no'].forEach(field => {
                frm.set_df_property(field, 'read_only', true);
                frm.set_df_property(field, 'reqd', false);
            });
            frm.refresh_field('motor_no');
        }

        if (frm.doc.select_item) {
            frappe.call({
                method: 'frappe.client.get_list',
                args: {
                    doctype: 'Item',
                    filters: {
                        name: frm.doc.select_item
                    },
                    fields: ['item_weight', 'item_name', 'item_color', 'model', 'item_sub_category', 'customer_price_pre_gst', 'tbi_gst_slab', 'item_mrp', 'hsn_code']
                },
                callback: function(r) {
                    const d = r.message[0];
                    
                    const quantity = parseFloat(frm.doc.quantity) || 1;

                    frm.set_value('item_name', d.item_name || '');
                    frm.set_value('item_color', d.item_color || '');
                    frm.set_value('model_name', d.model || '');
                    frm.set_value('item_type', d.item_sub_category || '');
                    frm.set_value('weight', (parseFloat(d.item_weight) || 0) * quantity);
                    frm.set_value('hsn_code', d.hsn_code || '0');
                    frm.set_value('mrp', d.item_mrp || '0');

                    const sub_total_unit = parseFloat(d.customer_price_pre_gst) || 0;
                    const sub_total = sub_total_unit * quantity;

                    frm.set_value('sub_total', sub_total);

                    const discount_type = frm.doc.discount_type;
                    const discount_per = parseFloat(frm.doc.discount_per) || 0;
                    const discount_amount = parseFloat(frm.doc.discount_amount) || 0;

                    let discount = 0;
                    if (discount_type === "Percentage") {
                        discount = (sub_total * discount_per) / 100;
                    } else if (discount_type === "Fixed Amount") {
                        discount = discount_amount;
                    }

                    frm.set_value('discount', discount);

                    const gst_slab = parseFloat(d.tbi_gst_slab) || 0;
                    frm.set_value('gst_slab', gst_slab);

                    const taxable_value = sub_total - discount;
                    const taxes_and_charges = (taxable_value * gst_slab) / 100;
                    const grand_total = taxable_value + taxes_and_charges;
                    const rounded_total = Math.round(grand_total);

                    const mrp = parseFloat(d.item_mrp) || 0;
                    const total_saving = (mrp * quantity) - rounded_total;

                    frm.set_value('taxable_value', taxable_value);
                    frm.set_value('taxes_and_charges', taxes_and_charges);
                    frm.set_value('grand_total', grand_total);
                    frm.set_value('rounded_total', rounded_total);
                    frm.set_value('total_saving', total_saving);
                }

            });
            
            frappe.db.get_doc('Item', frm.doc.select_item)
            .then(doc => {
                frm.set_value('details', doc.item_name);
            });
        } else {
            frm.set_value('details', '');
        }
    },

    discount_type: function(frm) {
        frm.set_value('discount_per', 0);
        frm.set_value('discount_amount', 0);
        updatePricing(frm);
    },

    discount_per: function(frm) {
        updatePricing(frm);
    },

    discount_amount: function(frm) {
        updatePricing(frm);
    }
});


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

function updatePricing(frm) {
    if (frm.doc.select_item && frm.doc.sub_total) {
        const sub_total = parseFloat(frm.doc.sub_total) || 0;
        const discount_type = frm.doc.discount_type;
        const discount_per = parseFloat(frm.doc.discount_per) || 0;
        const discount_amount = parseFloat(frm.doc.discount_amount) || 0;
        const gst_slab = parseFloat(frm.doc.gst_slab) || 0;

        let discount = 0;
        let gst_multiplier = 1 + (gst_slab / 100);

        if (discount_type === "Percentage") {
            discount = (sub_total * discount_per) / 100;
        } else if (discount_type === "Fixed Amount") {
            discount = discount_amount / gst_multiplier;
        }

        frm.set_value('discount', discount);

        const taxable_value = sub_total - discount;
        const taxes_and_charges = (taxable_value * gst_slab) / 100;
        const grand_total = taxable_value + taxes_and_charges;
        const rounded_total = Math.round(grand_total);
        const mrp = parseFloat(frm.doc.mrp) || 0;
        const total_saving = mrp - rounded_total;

        frm.set_value('taxable_value', taxable_value);
        frm.set_value('taxes_and_charges', taxes_and_charges);
        frm.set_value('grand_total', grand_total);
        frm.set_value('rounded_total', rounded_total);
        frm.set_value('total_saving', total_saving);
    }
}
