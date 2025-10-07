frappe.listview_settings['Customer Billing'] = {
    get_indicator: function(doc) {
        if (doc.docstatus === 1) {
            return [__("Billed"), "green"];

        }
    },

    onload: function(listview) {
        listview.page.add_inner_button(__('New Invoice'), function () {
            frappe.dom.freeze("Validating Current Stock");
            setTimeout(function() {
                frappe.new_doc('Customer Billing'); 
                location.reload();
                frappe.dom.unfreeze();
            }, 1000);
        });
        $("button[data-label='New%20Invoice']").removeClass("btn-default").addClass("manns_blue_button");
        if (!frappe.user.has_role('Administrator')) {
            $('.btn.icon-btn, button.grid-add-row').hide();
        }

    }
};
