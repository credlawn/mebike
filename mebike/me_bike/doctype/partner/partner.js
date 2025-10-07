frappe.ui.form.on("Partner", {   
    refresh: function (frm) {
        
        const readOnlyFields = [
            'partner_type', 'business_name', 'business_start_date', 'key_person_name', 
            'contact_no', 'email', 'business_address', 'landmark', 'city', 'state', 'pincode',
            'pan_no', 'gst_no', 'gst_filing_frequency', 'bank_ac_no', 'ifsc_code', 'ac_type'
        ];

        if (!frm.is_new()) {
            readOnlyFields.forEach(field => {
                frm.set_df_property(field, 'read_only', 1);
            });

            if (frappe.user.has_role('Accounts Manager') && !frm.is_new()) {

                frm.add_custom_button(__('Change Credit Limit'), function() {
                    let dialog = new frappe.ui.Dialog({
                        title: __('Maximum Credit Limit'),
                        fields: [{ fieldname: 'credit_limit', label: __('Enter Maximum Credit Limit'), fieldtype: 'Currency', reqd: 1 }],
                        primary_action_label: __('Update Limit'),
                        primary_action(values) {
                            frappe.confirm(__('Are you sure to update the Credit Limit?'),
                            async () => {
                                frm.set_value('credit_limit', values.credit_limit);
                                dialog.hide();
                                await frm.save();
                                frappe.msgprint(__('Credit Limit has been Updated Successfully'));
                            }, () => dialog.hide());
                        }
                    });
                    dialog.show();
                });
                $("button[data-label='Change%20Credit%20Limit']").removeClass("btn-default").addClass("manns_green_button");
            }

            if (frappe.user.has_role('Accounts Manager') && !frm.is_new()) {
                frm.add_custom_button(__('Edit Details'), () => {
                    readOnlyFields.forEach(field => {
                        frm.set_df_property(field, 'read_only', 0);
                        
                    });
                    $("button[data-label='Edit%20Details']").prop("disabled", true);
                });
                $("button[data-label='Edit%20Details']").removeClass("btn-default").addClass("manns_blue_button");
            }

            if (frappe.user.has_role('Accounts Manager') && frm.doc.status === 'Active' && !frm.is_new()) {
                frm.add_custom_button(__('Disable Partner'), () => {
                    frm.set_value('status', 'Inactive');
                    frm.save();
                    frappe.show_alert({ message: __("Partner Disabled"), indicator: 'red' }, 5);
                });
                $("button[data-label='Disable%20Partner']").removeClass("btn-default").addClass("manns_red_button");
            }

            if (frappe.user.has_role('Accounts Manager') && frm.doc.status === 'Inactive' && !frm.is_new()) {
                frm.add_custom_button(__('Enable Partner'), () => {
                    frm.set_value('status', 'Active');
                    frm.save();
                    frappe.show_alert({ message: __("Partner Enabled"), indicator: 'green' }, 5);
                });
                $("button[data-label='Enable%20Partner']").removeClass("btn-default").addClass("manns_green_button");
            }
        }
    }
});
