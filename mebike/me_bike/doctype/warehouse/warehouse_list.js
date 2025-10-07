frappe.listview_settings['Warehouse'] = {
    hide_name_column: true,
    hide_name_filter: true,

    onload: function(listview) {
        $('.layout-side-section').hide();
        $('.layout-main-section-wrapper, .layout-main-section').css('margin-left', '0');
        $('.page-container').addClass('no-sidebar');

        setTimeout(() => {
            $('.warehouse_name_column').css('width', '500px');
        }, 500);
        
        if (!frappe.user.has_role('Administrator')) {
            $('.btn.icon-btn, button.grid-add-row').hide();
        }
    }
};
