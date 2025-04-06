frappe.listview_settings["Item"] = {
    get_indicator(doc) {
        if (doc.status === 'In Stock') {
            return [__("In Stock"), "green"];
        } else if (doc.status === 'Out of Stock') {
            return [__("Out of Stock"), "red"];
        }
    },
    onload: function(listview) {
        $('.layout-side-section').hide();
        $('.layout-main-section-wrapper, .layout-main-section').css('margin-left', '0');
        $('.page-container').addClass('no-sidebar');
    }
};
