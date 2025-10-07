from frappe.model.document import Document

class StateList(Document):
    def validate(self):
        if self.state_name:
            self.state_name = self.state_name.title().strip()
        if self.name:
            self.name = self.name.title().strip()
        
