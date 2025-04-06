frappe.ui.form.on('Warehouse', {
    refresh: function(frm) {
        frm.fields_dict["warehouse_items"].grid.get_field("rate").onchange = function(evt, cdt, cdn) {
            calculate_amount(frm, cdt, cdn);
            update_totals(frm);
        };
        frm.fields_dict["warehouse_items"].grid.get_field("quantity").onchange = function(evt, cdt, cdn) {
            calculate_amount(frm, cdt, cdn);
            update_totals(frm);
        };
    }
});

frappe.ui.form.on('Warehouse Items', {
    rate: function(frm, cdt, cdn) {
        calculate_amount(frm, cdt, cdn);
        update_totals(frm);
    },
    quantity: function(frm, cdt, cdn) {
        calculate_amount(frm, cdt, cdn);
        update_totals(frm);
    }
});

function calculate_amount(frm, cdt, cdn) {
    let row = locals[cdt][cdn]; // Get the specific row in the child table
    if (row.rate && row.quantity) {
        let new_amount = row.rate * row.quantity;
        frappe.model.set_value(cdt, cdn, "amount", new_amount);
    }
}

function update_totals(frm) {
    let total_quantity = 0;
    let total_amount = 0;

    frm.doc.warehouse_items.forEach(item => {
        total_quantity += item.quantity || 0;
        total_amount += item.amount || 0;
    });

    frm.set_value("total_stock_quantity", total_quantity);
    frm.set_value("total_stock_amount", total_amount);
}
