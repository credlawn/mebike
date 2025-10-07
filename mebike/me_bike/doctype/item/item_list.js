frappe.listview_settings["Item"] = {
    get_indicator(doc) {
        if (doc.status === 'In Stock') {
            return [__("In Stock"), "green"];
        } else if (doc.status === 'Out of Stock') {
            return [__("Out of Stock"), "red"];
        }
    },
    onload: function(listview) {
    listview.page.add_inner_button(__('Create New Item'), function() {
        frappe.new_doc('Item').then(function(frm) {
            frm.refresh_fields();
            setTimeout(function() {
                frm.refresh();
            }, 100);
        });
    });
    $("button[data-label='Create%20New%20Item']").removeClass("btn-default").addClass("manns_blue_button");
    if (!frappe.user.has_role('Administrator')) {
            $('.btn.icon-btn, button.grid-add-row').hide();
        }
}
};
