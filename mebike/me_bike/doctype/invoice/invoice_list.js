frappe.listview_settings["Invoice"] = {
    get_indicator(doc) {
        if (doc.status === 'Not Paid') {
            return [__("Not Paid"), "red"];
        } else if (doc.status === 'Partial Paid') {
            return [__("Partial Paid"), "orange"];
        } else if (doc.status === 'Paid') {
            return [__("Paid"), "green"];
        }
    },

    onload: function(listview) {    
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

