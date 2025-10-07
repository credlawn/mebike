frappe.listview_settings['Partner'] = {
    get_indicator(doc) {
        if (doc.status === 'Active') {
            return [__("Active"), "green"];
        } else if (doc.status === 'Inactive') {
            return [__("Inactive"), "red"];
        }
    },
    onload: function(listview) {
        $('.layout-side-section').hide();
        $('.layout-main-section-wrapper, .layout-main-section').css('margin-left', '0');
        $('.page-container').addClass('no-sidebar');
    }
};
