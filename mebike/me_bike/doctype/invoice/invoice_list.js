frappe.listview_settings["Invoice"] = {
    

    get_indicator: function(doc) {
        if (doc.docstatus === 1) {
            return [__("Billed"), "green"];

        }
    },
    onload: function(listview) {
        $('.layout-side-section').hide();
        $('.layout-main-section-wrapper, .layout-main-section').css('margin-left', '0');
        $('.page-container').addClass('no-sidebar');
        if (!frappe.user.has_role('Administrator')) {
            $('.btn.icon-btn, button.grid-add-row').hide();
        }
    }
};

