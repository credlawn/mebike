frappe.ui.form.on('Purchase', {

    refresh: function(frm) {
        
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

            $('#add_item_btn').on('click', function() {
                const item_code = frm.fields_dict['select_item'].value;
                const quantity = frm.fields_dict['select_quantity'].value;

                if (!item_code || !quantity || quantity <= 0) {
                    frappe.msgprint(__("Please select an item and enter a valid quantity."));
                    return;
                }

                frappe.call({
                    method: 'frappe.client.get',
                    args: {
                        doctype: 'Item',
                        name: item_code
                    },
                    callback: function(r) {
                        if (r.message) {
                            const item = r.message;
                            const min_qty = item.minimum_quantity || 0;
                            const max_qty = item.maximum_quantity || Infinity;

                            if (quantity < min_qty) {
                                frappe.msgprint(__("Minimum order Quantity must be - <b><span style='color: red; font-size: 16px;'>{0}</span></b>", [min_qty]));
                                return;
                            } else if (quantity > max_qty) {
                                frappe.msgprint(__("Cannot Place Order More Than <b><span style='color: red; font-size: 16px;'>{0}</span></b> unit", [max_qty]));
                                return;
                            }

                            let existing_row = frm.fields_dict['items'].grid.get_data().find(row => row.item_code === item_code);

                            if (existing_row) {
                                frappe.model.set_value(existing_row.doctype, existing_row.name, 'quantity', quantity);
                                fetchItemDetailsAndCalculate(frm, existing_row.doctype, existing_row.name);
                            } else {
                                let new_row = frappe.model.add_child(frm.doc, 'items', 'items');
                                if (!new_row) return frappe.msgprint(__("Failed to add new row to child table."));
                                
                                frappe.model.set_value(new_row.doctype, new_row.name, 'item_code', item_code);
                                frappe.model.set_value(new_row.doctype, new_row.name, 'quantity', quantity);
                                fetchItemDetailsAndCalculate(frm, new_row.doctype, new_row.name);
                            }

                            frm.fields_dict['items'].grid.refresh();
                            frm.set_value('select_item', '');
                            frm.set_value('select_quantity', '');
                            frm.fields_dict['select_item'].set_focus();
                        }
                    }
                });
            });
        }

        if (
            frappe.user.has_role('Accounts Manager') &&
            (frm.doc.status === "Amount Pending" || frm.doc.status === "Approval Pending") &&
            !frm.is_new()
        ) {
            frm.add_custom_button(__('Reject PO'), function() {
                frappe.confirm(
                    __('Are you sure you want to reject this PO?'),
                    function() {
                        frappe.call({
                            method: 'frappe.client.set_value',
                            args: {
                                doctype: frm.doc.doctype,
                                name: frm.doc.name,
                                fieldname: 'status',
                                value: 'Rejected'
                            },
                            callback: function(r) {
                                if(!r.exc) {
                                    frm.reload_doc();
                                    frappe.show_alert({message: __('PO Rejected'), indicator: 'red'});
                                }
                            }
                        });
                    },
                    function() {
                    }
                );
            });

            $("button[data-label='Reject%20PO']").removeClass("btn-default").addClass("manns_red_button");
        }




        if (
            frappe.user.has_role('Accounts Manager') &&
            (frm.doc.status === "Amount Pending") &&
            !frm.is_new()
        ) {
            frm.add_custom_button(__('Refresh Limit'), function() {
                frappe.call({
                    method: 'mebike.scripts.refresh_credit_limit.refresh_available_credit_limit',
                    args: { docname: frm.doc.name },
                    callback: function(response) {
                        if (response.message) {
                            let formattedAmount = response.message;
                            let numericAmount = parseFloat(formattedAmount.replace(/[^0-9.-]+/g, ""));
                            let color = numericAmount < 1 ? "red" : "green";
                            let total_value = frm.doc.rounded_total || 0;

                            if (numericAmount >= total_value) {
                                frappe.call({
                                    method: 'frappe.client.set_value',
                                    args: {
                                        doctype: 'Purchase',
                                        name: frm.doc.name,
                                        fieldname: 'status',
                                        value: 'Ready for Billing'
                                    },
                                    callback: function() {
                                        frappe.msgprint({
                                            message: __(
                                                `Available Credit Limit is <b style="color: {0};">₹ {1}</b><br><br>` +
                                                `<b style="color: green;">This PO can be Billed Now</b>`,
                                                [color, formattedAmount]
                                            ),
                                            indicator: 'green',
                                            title: __('Credit Approved')
                                        });
                                        frm.reload_doc();
                                    }
                                });
                            } else {
                                let shortfall = total_value - numericAmount;
                                frappe.msgprint({
                                    message: __(
                                        `Available Credit Limit is <b style="color: {0};">₹ {1}</b><br><br>` +
                                        `<b style="color: red;">Shortfall: ₹ ${shortfall.toLocaleString('en-IN')}</b>`,
                                        [color, formattedAmount]
                                    ),
                                    indicator: 'red',
                                    title: __('Credit Limit is Low')
                                });
                            }
                        }
                    }
                });
            });
            $("button[data-label='Refresh%20Limit']").removeClass("btn-default").addClass("manns_green_button");
        }

        if (
            frappe.user.has_role('Manns Partner') && !frm.is_new() && frm.doc.status === "Amount Pending" ) {
            frm.add_custom_button(__('Check Short Amount'), function() {
                frappe.call({
                    method: 'mebike.scripts.refresh_credit_limit.refresh_available_credit_limit',
                    args: { docname: frm.doc.name },
                    callback: function(response) {
                        if (response.message) {
                            let formattedAmount = response.message;
                            let numericAmount = parseFloat(formattedAmount.replace(/[^0-9.-]+/g, ""));
                            let color = numericAmount < 1 ? "red" : "green";
                            let total_value = frm.doc.rounded_total || 0;

                            if (numericAmount >= total_value) {
                                frappe.msgprint({
                                    message: __(
                                        `Available Limit is <b style="color: {0};">₹ {1}</b><br><br>` +
                                        `<b style="color: green;">This PO can be Billed Now</b>`,
                                        [color, formattedAmount]
                                    ),
                                    indicator: 'green',
                                    title: __('Sufficient Limit')
                                });
                            } else {
                                let shortfall = total_value - numericAmount;
                                frappe.msgprint({
                                    message: __(
                                        `Your Available Limit: <b style="color: ${color}; font-weight: 600;">₹ ${formattedAmount}</b><br><br>` +
                                        `Shortfall Amount: <span style="color: red; font-weight: 600;">₹ ${shortfall.toLocaleString('en-IN')}</span>`
                                    ),

                                    indicator: 'red',
                                    title: __('Avaliable Limit is Low')
                                });
                            }
                        }
                    }
                });
            });
            $("button[data-label='Check%20Short%20Amount']").removeClass("btn-default").addClass("manns_blue_button");
        }

                
        if (frappe.user.has_role('Accounts Manager') && frm.doc.status === "Approval Pending" && !frm.is_new()) {
            frm.add_custom_button(__('Approve PO'), function () {
                let credit_limit = frm.doc.available_credit_limit || 0;
                let total_value = frm.doc.rounded_total || 0;

                if (credit_limit < total_value) {
                    let shortfall = total_value - credit_limit;

                    frappe.msgprint({
                        message: __(`PO Approved but Credit Limit is less than Total Purchase Value<br><br>
                            <b style="color: red;">Short Value: ₹ ${shortfall.toLocaleString('en-IN')}</b>`),
                        indicator: 'red',
                        title: __('PO Approved')
                    });

                    frappe.call({
                        method: 'frappe.client.set_value',
                        args: {
                            doctype: 'Purchase',
                            name: frm.doc.name,
                            fieldname: 'status',
                            value: 'Amount Pending'
                        }
                    });

                } else {
                    frappe.call({
                        method: 'frappe.client.set_value',
                        args: {
                            doctype: 'Purchase',
                            name: frm.doc.name,
                            fieldname: 'status',
                            value: 'Ready for Billing'
                        }
                    }).then(() => {
                        frappe.msgprint(__('PO approved successfully & Can be Billed Now'));
                    });
                }
            });

            $("button[data-label='Approve%20PO']").removeClass("btn-default").addClass("manns_green_button");
        }


        if (frappe.user.has_role('Accounts Manager') && frm.doc.status === "Approval Pending" && !frm.is_new()) {
            frm.add_custom_button(__('Edit PO'), function() {
                frm.set_df_property('items', 'read_only', false);
                frm.toggle_display('xyz', true);
                frm.enable_save();
                grid.wrapper.find('.grid-row').css('pointer-events', 'auto');
                frm.remove_custom_button('Approve PO');
                frm.remove_custom_button('Refresh Limit');

            });
            $("button[data-label='Edit%20PO']").removeClass("btn-default").addClass("manns_red_button");
        }

        


        if (frappe.user.has_role('Accounts Manager') && frm.doc.status === 'Ready for Billing' && !frm.is_new()) {
            frm.add_custom_button(__('Generate Invoice'), function() {
                frappe.call({
                    method: 'mebike.scripts.generate_invoice.create_invoice_from_purchase',
                    args: {
                        purchase_doc_name: frm.doc.name
                    },
                    callback: function(r) {
                        if (!r.exc) {
                            frappe.msgprint(__('Invoice {0} Generated Successfully.', [r.message]));
                            frappe.set_route('Form', 'Invoice', r.message);
                        }
                    }
                });
            });
            $("button[data-label='Generate%20Invoice']").removeClass("btn-default").addClass("manns_green_button");
        }
        
        if (frappe.user.has_role('Manns Partner') && frm.doc.status === 'Stock in Transit' && !frm.is_new()) {
            frm.add_custom_button(__('Receive Stock'), function() {
                frappe.call({
                    method: 'mebike.scripts.receive_stock.create_inventory_from_invoice',
                    args: { purchase_doc_name: frm.doc.name },
                    callback: function(r) {
                        if (r.message.success) {
                            frappe.show_alert(__('Stock Received & Inventory Updated!'), 5);
                            frm.reload_doc();
                        } else {
                            frappe.msgprint(r.message.message);
                        }
                    },
                    freeze: true,
                    freeze_message: __('Receiving Stock...')
                });
            });
            $("button[data-label='Receive%20Stock']").removeClass("btn-default").addClass("manns_green_button");
        }
    }
})

function fetchItemDetailsAndCalculate(frm, cdt, cdn) {
    var row = locals[cdt][cdn];

    if (row.item_code) {
        frappe.db.get_value('Item', row.item_code, ['partner_price_before_gst', 'item_name', 'partner_gst', 'item_weight', 'hsn_code', 'item_mrp', 'tbi_gst_slab'], function(data) {
            // Set item details in the new row
            frappe.model.set_value(cdt, cdn, 'rate', data.partner_price_before_gst);
            frappe.model.set_value(cdt, cdn, 'item_name', data.item_name);
            frappe.model.set_value(cdt, cdn, 'item_gst', data.partner_gst);
            frappe.model.set_value(cdt, cdn, 'item_weight', data.item_weight);
            frappe.model.set_value(cdt, cdn, 'hsn_code', data.hsn_code);
            frappe.model.set_value(cdt, cdn, 'item_mrp', data.item_mrp);
            frappe.model.set_value(cdt, cdn, 'item_gst_slab', data.tbi_gst_slab);

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
    },

    discount: function(frm, cdt, cdn) {
        update_amount(cdt, cdn);
        update_sub_total(frm);
        update_partner_gst(frm);
        update_grand_total(frm);
        update_rounded_total(frm);
    },

    item_gst_slab: function(frm, cdt, cdn) {
        update_amount(cdt, cdn);
        update_sub_total(frm);
        update_partner_gst(frm);
        update_grand_total(frm);
        update_rounded_total(frm);
    }
});

function update_amount(cdt, cdn) {
    var row = locals[cdt][cdn];
    var gst_slab = parseFloat(row.item_gst_slab) || 0;
    var divisor = 1 + (gst_slab / 100);
    var discount_val = row.discount || 0;
    var rate = row.rate || 0;
    var quantity = row.quantity || 0;
    var discounted_rate = rate - (discount_val / divisor);
    var amount = discounted_rate * quantity;
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
        var gst_slab = parseFloat(row.item_gst_slab) || 0;
        var gst_fraction = gst_slab / 100;
        var row_amount = row.amount || 0;
        total_gst += row_amount * gst_fraction;
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