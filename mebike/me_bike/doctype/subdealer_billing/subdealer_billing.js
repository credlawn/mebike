frappe.ui.form.on('Subdealer Billing', {
    onload: function(frm) {
        set_select_item_query(frm);

        let user_email = frappe.session.user === "Administrator" ? "billing@mebikeindia.com" : frappe.session.user;

        frappe.db.get_value('Partner', { email: user_email, status: "Active" }, 'name')
            .then(res => {
                if (res.message && res.message.name) {
                    let partner_name = res.message.name;
                    frappe.db.get_list('Partner', {
                        filters: { mapped_dealer: partner_name, status: "Active" },
                        fields: ['name']
                    }).then(results => {
                        let options = results.map(r => r.name);
                        frm.set_query('partner_code', () => ({ filters: { name: ['in', options] } }));
                    });
                }
            });
    },

    refresh: function(frm) {
        set_select_item_query(frm);

        if (frm.is_new() || frm.is_dirty()) {
            frm.toggle_display('xyz', true);
            frm.enable_save();
        } else {
            frm.toggle_display('xyz', false);
            frm.set_df_property('items', 'read_only', true);
            frm.disable_save();
        }

        if (!frm.doc.partner_code) {
            frm.toggle_display('partner_code', true);
            frm.toggle_display('partner_name', false);
            frm.set_df_property('partner_code', 'read_only', false);
        } else {
            frm.toggle_display('partner_code', false);
            frm.toggle_display('partner_name', true);
            frm.set_df_property('partner_name', 'read_only', true);
        }

        const grid = frm.fields_dict.items.grid;
        grid.wrapper.find('.grid-row').css('pointer-events', 'none');

        if (frm.fields_dict['select_quantity']) {
            const $wrapper = frm.fields_dict['select_quantity'].$wrapper;
            if ($('#add_item_btn').length === 0) {
                $wrapper.css({ display: 'flex', alignItems: 'center', gap: '25px' })
                    .append('<button class="btn btn-sm manns_green_button" id="add_item_btn">Add Item</button>');
            }

            $('#add_item_btn').off('click').on('click', function() {
                const item_code = frm.fields_dict['select_item'].value;
                const quantity_raw = frm.fields_dict['select_quantity'].value;
                const quantity = parseFloat(quantity_raw);

                if (!item_code) {
                    frappe.msgprint({
                        title: __("No Item Selected"),
                        message: __("<div style='color: red; font-size: 18px;'>Please select an item to proceed.</div>"),
                        indicator: 'red'
                    });
                    return;
                }

                if (!quantity || quantity <= 0) {
                    frappe.msgprint({
                        title: __("Incorrect Quantity"),
                        message: __("<div style='color: red; font-size: 18px;'>Please enter a valid quantity to proceed.</div>"),
                        indicator: 'red'
                    });
                    return;
                }

                frappe.db.get_value('Item', item_code, ['tbi_gst_slab']).then(r => {
                    const data = r.message;
                    const item_gst_slab = data.tbi_gst_slab;
                    const form_gst_slab = frm.doc.gst_slab;
                    if (form_gst_slab && form_gst_slab !== item_gst_slab) {
                        frappe.msgprint({
                            title: __("Item With Different GST Slab"),
                            message: __(
                                `<div style='font-size: 14px;'>
                                    This item has a different
                                    <span style='color:red;'>GST Rate ({0}%)</span>
                                    than the previous 
                                    <span style='color:red;'>GST Rate ({1}%)</span>.
                                    Please bill separately.
                                </div>`,
                                [item_gst_slab, form_gst_slab]
                            ),
                            indicator: 'red'

                        });
                        return;
                    }



                    frappe.call({
                        method: 'mebike.scripts.subdealer_filter.get_item_quantity_for_user',
                        args: { item_code: item_code },
                        callback: function(res) {
                            const available_qty = res.message;

                            if (available_qty === null || available_qty === 0 || available_qty === undefined) {
                                frappe.msgprint({
                                    title: __("🔔 Insufficient Stock"),
                                    message: __("<div style='color: red; font-size: 18px;'>This item is currently out of stock.</div>"),
                                    indicator: 'red'
                                });
                                return;
                            }

                            if (quantity > parseFloat(available_qty)) {
                                let unit_label = (parseFloat(available_qty) === 1) ? "unit" : "units";
                                frappe.msgprint({
                                    title: __("🔔 Insufficient Stock"),
                                    message: __("<div style='color: red; font-size: 18px;'>Available stock is <b>{0} {1}</b>.</div>", [available_qty, unit_label]),
                                    indicator: 'red'
                                });

                                return;
                            }

                            let existing_row = frm.fields_dict['items'].grid.get_data()
                                .find(row => row.item_code === item_code);

                            if (existing_row) {
                                frappe.model.set_value(existing_row.doctype, existing_row.name, 'quantity', quantity);
                                fetchItemDetailsAndCalculate(frm, existing_row.doctype, existing_row.name);
                            } else {
                                let new_row = frappe.model.add_child(frm.doc, 'items', 'items');
                                if (!new_row) {
                                    frappe.msgprint(__("Failed to add new row to child table."));
                                    return;
                                }

                                frappe.model.set_value(new_row.doctype, new_row.name, 'item_code', item_code);
                                frappe.model.set_value(new_row.doctype, new_row.name, 'quantity', quantity);
                                fetchItemDetailsAndCalculate(frm, new_row.doctype, new_row.name);
                            }

                            frm.fields_dict['items'].grid.refresh();
                            frm.set_value('select_item', '');
                            frm.set_value('select_quantity', '');
                            frm.fields_dict['select_item'].set_focus();
                        }
                    });
                });
            });
        }


        if (frappe.user.has_role('Manns Partner') && frm.doc.status !== 1 && !frm.is_new()) {
            frm.add_custom_button(__('Edit'), function() {
                frm.set_df_property('items', 'read_only', false);
                frm.toggle_display('xyz', true);
                frm.enable_save();
                grid.wrapper.find('.grid-row').css('pointer-events', 'auto');
                frm.remove_custom_button('Approve PO');
                frm.remove_custom_button('Refresh Limit');

            });
            $("button[data-label='Edit']").removeClass("btn-default").addClass("manns_red_button");
        }

        if (frappe.user.has_role('Manns Partner') && frm.doc.status !== 1 && !frm.is_new()) {
            frm.add_custom_button(__('Download Invoice'), function() {
                var doc_name = frm.doc.name;
                var url = `https://billing.mebikeindia.com/api/method/frappe.utils.print_format.download_pdf?doctype=Subdealer%20Billing&name=${encodeURIComponent(doc_name)}&settings=%7B%7D&_lang=en`;
                window.open(url, '_blank');
            })
            $("button[data-label='Download%20Invoice']").removeClass("btn-default").addClass("manns_green_button");
        }

        
        
    },

    select_category: function(frm) {
        frm.set_value('select_item', '');
        frm.set_value('select_quantity', '')
        set_select_item_query(frm);
    },
})

function set_select_item_query(frm) {
    frm.fields_dict['select_item'].get_query = () => {
        const filters = {
            status: "In Stock"
        };
        if (frm.doc.select_category) {
            filters.item_sub_category = frm.doc.select_category;

        }
        return { filters };
    };
}

function fetchItemDetailsAndCalculate(frm, cdt, cdn) {
    var row = locals[cdt][cdn];

    if (row.item_code) {
        frappe.db.get_value('Item', row.item_code, ['partner_price_before_gst', 'item_name', 'tbi_gst_slab', 'partner_gst', 'item_weight', 'hsn_code', 'item_mrp'], function(data) {
            // Set item details in the new row
            frappe.model.set_value(cdt, cdn, 'rate', data.partner_price_before_gst);
            frappe.model.set_value(cdt, cdn, 'item_name', data.item_name);
            frappe.model.set_value(cdt, cdn, 'item_gst', data.partner_gst);
            frappe.model.set_value(cdt, cdn, 'item_weight', data.item_weight);
            frappe.model.set_value(cdt, cdn, 'hsn_code', data.hsn_code);
            frappe.model.set_value(cdt, cdn, 'item_mrp', data.item_mrp);
            frappe.model.set_value(cdt, cdn, 'item_gst_slab', data.tbi_gst_slab);
            frappe.model.set_value(frm.doctype, frm.docname, 'gst_slab', data.tbi_gst_slab)
            frm.refresh_field('gst_slab');
            

            // Trigger calculations for the new row
            update_amount(cdt, cdn);
            update_sub_total(frm);
            update_total_quantity(frm);
            update_partner_gst(frm);
            update_total_weight(frm);
            update_grand_total(frm);
            update_rounded_total(frm);

            // Manually refresh the grid after calculations
            frm.fields_dict['items'].grid.refresh();
        });
    } else {
        // If no item_code, set default values
        frappe.model.set_value(cdt, cdn, 'rate', 0);
        frappe.model.set_value(cdt, cdn, 'item_name', '');
        frappe.model.set_value(cdt, cdn, 'item_gst', 0);
        frappe.model.set_value(cdt, cdn, 'item_weight', 0);
        frappe.model.set_value(cdt, cdn, 'hsn_code', 0);
        frappe.model.set_value(cdt, cdn, 'item_mrp', 0);
        frappe.model.set_value(cdt, cdn, 'item_gst_slab', 0);
    }

    if (!row.quantity) {
        frappe.model.set_value(cdt, cdn, 'quantity', 1);
    }

    // Trigger calculations for the new row
    update_amount(cdt, cdn);
    update_sub_total(frm);
    update_total_quantity(frm);
    update_partner_gst(frm);
    update_total_weight(frm);
    update_grand_total(frm);
    update_rounded_total(frm);

    // Manually refresh the grid after calculations
    frm.fields_dict['items'].grid.refresh();
}

frappe.ui.form.on('Items', {
    quantity: function(frm, cdt, cdn) {
        update_amount(cdt, cdn);
        update_sub_total(frm);
        update_total_quantity(frm);
        update_partner_gst(frm);
        update_total_weight(frm);
        update_grand_total(frm);
        update_rounded_total(frm);
    },

    rate: function(frm, cdt, cdn) {
        update_amount(cdt, cdn);
        update_sub_total(frm);
        update_total_quantity(frm);
        update_partner_gst(frm);
        update_total_weight(frm);
        update_grand_total(frm);
        update_rounded_total(frm);
    }
});

function update_amount(cdt, cdn) {
    var row = locals[cdt][cdn];
    var amount = row.rate * row.quantity;
    frappe.model.set_value(cdt, cdn, 'amount', amount);
}

function update_sub_total(frm) {
    var total_amount = 0;
    $.each(frm.fields_dict['items'].grid.get_data(), function(i, row) {
        total_amount += row.amount || 0;  
    });
    frappe.model.set_value(frm.doctype, frm.docname, 'sub_total', total_amount);
}

function update_total_quantity(frm) {
    var total_quantity = 0;
    $.each(frm.fields_dict['items'].grid.get_data(), function(i, row) {
        total_quantity += row.quantity || 0;
    });
    frappe.model.set_value(frm.doctype, frm.docname, 'total_quantity', total_quantity);
}

function update_total_weight(frm) {
    var total_weight = 0;
    $.each(frm.fields_dict['items'].grid.get_data(), function(i, row) {
        total_weight += (row.item_weight || 0) * (row.quantity || 0);
    });
    frappe.model.set_value(frm.doctype, frm.docname, 'total_weight', total_weight);
}

function update_partner_gst(frm) {
    var total_gst = 0;
    $.each(frm.fields_dict['items'].grid.get_data(), function(i, row) {
        total_gst += (row.item_gst || 0) * (row.quantity || 0);
    });
    frappe.model.set_value(frm.doctype, frm.docname, 'total_taxes_and_charges', total_gst);
}

function update_grand_total(frm) {
    var sub_total = frm.doc.sub_total || 0;
    var total_taxes_and_charges = frm.doc.total_taxes_and_charges || 0;
    var grand_total = sub_total + total_taxes_and_charges;
    frappe.model.set_value(frm.doctype, frm.docname, 'grand_total', grand_total);
}

function update_rounded_total(frm) {
    var grand_total = frm.doc.grand_total || 0;
    var rounded_total = Math.round(grand_total);
    frappe.model.set_value(frm.doctype, frm.docname, 'rounded_total', rounded_total);
}