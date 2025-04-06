frappe.listview_settings['Billing'] = {
    get_indicator(doc) {
        if (doc.status === 'Invoice Not Generated') {
            return [__("Invoice Not Generated"), "red"];
        } else if (doc.status === 'Invoice Generated') {
            return [__("Invoice Generaed"), "green"];
        }
    },
    onload(listview) {
        $('.btn-primary').hide();
        $('.layout-side-section').hide();
        $('.layout-main-section-wrapper, .layout-main-section').css('margin-left', '0');
        $('.page-container').addClass('no-sidebar');
        listview.page.actions.find(`
            [data-label="Export"],
            [data-label="Assign%20To"],
            [data-label="Clear%20Assignment"],
            [data-label="Apply%20Assignment%20Rule"],
            [data-label="Add%20Tags"]
        `).parent().parent().remove();
    }
};