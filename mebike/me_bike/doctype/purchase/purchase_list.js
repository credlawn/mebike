frappe.listview_settings['Purchase'] = {
    get_indicator: function(doc) {
        if (doc.status === 'Ready for Billing') {
            return [__("Ready for Billing"), "blue"];
        } else if (doc.status === 'Stock in Transit') {
            return [__("Stock in Transit"), "yellow"];
        } else if (doc.status === 'Stock Delivered') {
            return [__("Stock Delivered"), "green"];
        } else if (doc.status === 'Rejected') {
            return [__("Rejected"), "red"];
        }
    },

    onload: function(listview) {

        listview.page.add_inner_button(__('Create New Order'), function () {
            let freezeDialog = new frappe.ui.Dialog({
                title: __('Please wait while we get stock availability'),
            });

            freezeDialog.show();

            setTimeout(function() {
                frappe.new_doc('Purchase');
                location.reload();
            }, 1000);
        });
        $("button[data-label='Create%20New%20Order']").removeClass("btn-default").addClass("manns_blue_button");
        if (!frappe.user.has_role('Administrator')) {
            $('.btn.icon-btn').hide();
            const actionsToRemove = ['Edit','Export','Assign%20To','Clear%20Assignment','Apply%20Assignment%20Rule','Add%20Tags'];
            actionsToRemove.forEach(action => {
                listview.page.actions.find(`[data-label="${action}"]`).closest('li').remove();
            });
            
        }

    }
};
