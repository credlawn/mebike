frappe.ui.form.on('Invoice', {
    refresh: function(frm) {
        frm.fields_dict['items'].grid.wrapper.find('.grid-row').each(function() {
            $(this).css('pointer-events', 'none');
        });
    }
});
