frappe.listview_settings['Credit Note'] = {
    hide_name_column: true,
    hide_name_filter: true,


    onload: function(listview) {

        $('.layout-side-section').hide();
        $('.layout-main-section-wrapper, .layout-main-section').css('margin-left', '0');
        $('.page-container').addClass('no-sidebar');

        
    }
    
};
