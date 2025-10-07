frappe.ui.form.on('Received Payment', {
    onload: function(frm) {
        if (!frm.is_new() && frm.doc.docstatus === 0) {
            make_fields_readonly(frm);
        }
    },

    refresh: function(frm) {
        // Show edit button only if document is saved but not submitted
        if (!frm.is_new() && frm.doc.docstatus === 0) {
            add_edit_button(frm);
        }
    }
});

function make_fields_readonly(frm) {
    const fields = [
        'transaction_date',
        'partner_code',
        'partner_name',
        'transaction_amount',
        'remarks',
        'bank_account',
        'transaction_mode'
    ];

    fields.forEach(field => {
        frm.set_df_property(field, 'read_only', 1);
    });
}

function make_fields_editable(frm) {
    const fields = [
        'transaction_date',
        'partner_code',
        'partner_name',
        'transaction_amount',
        'remarks',
        'bank_account',
        'transaction_mode'
    ];

    fields.forEach(field => {
        frm.set_df_property(field, 'read_only', 0);
    });

    frappe.show_alert('Fields are now editable.');
}

function add_edit_button(frm) {
    frm.add_custom_button('Edit Details', function () {
        make_fields_editable(frm);
    });
}
