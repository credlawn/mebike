frappe.listview_settings['Partner Books'] = {
    onload: function(listview) {
        if (!frappe.user.has_role('Administrator')) {
            $('.btn.icon-btn, button.grid-add-row').hide();
            const actionsToRemove = ['Edit','Export','Assign%20To','Clear%20Assignment','Apply%20Assignment%20Rule','Add%20Tags'];
            actionsToRemove.forEach(action => {
                listview.page.actions.find(`[data-label="${action}"]`).closest('li').remove();
            });
        }
    }
};
