frappe.ui.form.on('Selling', {
    onload: function(frm) {
        frm.get_field('items').grid.cannot_add_rows = true;
    },

    select_category: function(frm) {
        frm.set_value('select_item', '');
        frm.fields_dict['select_item'].get_query = function(doc) {
            return { filters: { item_category: frm.doc.select_category } };
        };
        frm.refresh_field('select_item');
    },

    refresh: function(frm) { 
        if (frm.fields_dict['select_quantity']) {
            const $wrapper = frm.fields_dict['select_quantity'].$wrapper;
            if ($('#add_item_btn').length === 0) {
                $wrapper.css({ display: 'flex', alignItems: 'center', gap: '25px' })
                    .append('<button class="btn btn-sm btn-primary" id="add_item_btn">Add Item</button>');
            }

            $('#add_item_btn').on('click', function() {
                const item_code = frm.fields_dict['select_item'].value;
                const quantity = frm.fields_dict['select_quantity'].value;

                if (!item_code || !quantity || quantity <= 0) {
                    frappe.msgprint(__("Please select an item and enter a valid quantity."));
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
            });
        }
    
        setTimeout(() => {
            frm.page.actions.find('[data-label="Help"]').parent().parent().remove();
        }, 500);

        if (!frm.is_new()) {
            frm.fields_dict['section_break_nocy'].wrapper.hide();
            frm.set_df_property('items', 'read_only', true);

        } else {
            frm.set_df_property('items', 'read_only', false);


        }

        


        
        
        
    }
});



function fetchItemDetailsAndCalculate(frm, cdt, cdn) {
    var row = locals[cdt][cdn];

    if (row.item_code) {
        frappe.db.get_value('Item', row.item_code, ['partner_price_before_gst', 'item_name', 'partner_gst', 'item_weight'], function(data) {
            // Set item details in the new row
            frappe.model.set_value(cdt, cdn, 'rate', data.partner_price_before_gst);
            frappe.model.set_value(cdt, cdn, 'item_name', data.item_name);
            frappe.model.set_value(cdt, cdn, 'item_gst', data.partner_gst);
            frappe.model.set_value(cdt, cdn, 'item_weight', data.item_weight);

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