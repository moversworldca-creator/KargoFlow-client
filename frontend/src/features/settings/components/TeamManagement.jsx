// Settings → Team & Security → Team Members.
// The employee directory and member access live in ../userManagement; see
// docs/user-management-rbac.md for the Employee / User model.
import EmployeeDirectory from '../userManagement/EmployeeDirectory';

export default function TeamManagement({ branchId }) {
  return <EmployeeDirectory branchId={branchId} />;
}
