import LaraBase from '@primeuix/themes/lara/base';
import LaraButton from '@primeuix/themes/lara/button';
import LaraCheckbox from '@primeuix/themes/lara/checkbox';
import LaraDataTable from '@primeuix/themes/lara/datatable';
import LaraDialog from '@primeuix/themes/lara/dialog';
import LaraDrawer from '@primeuix/themes/lara/drawer';
import LaraFileUpload from '@primeuix/themes/lara/fileupload';
import LaraMessage from '@primeuix/themes/lara/message';
import LaraMultiSelect from '@primeuix/themes/lara/multiselect';
import LaraPaginator from '@primeuix/themes/lara/paginator';
import LaraPanelMenu from '@primeuix/themes/lara/panelmenu';
import LaraRipple from '@primeuix/themes/lara/ripple';
import LaraSelect from '@primeuix/themes/lara/select';
import LaraToast from '@primeuix/themes/lara/toast';

/**
 * Exact Lara tokens for the PrimeNG controls reachable from the dashboard.
 *
 * The upstream Lara aggregate eagerly imports every PrimeNG component theme.
 * Keeping the same base and per-control definitions avoids shipping theme data
 * for controls that are not part of this application, without changing the
 * visual contract of any control that is rendered.
 */
const LaraDashboard = {
  ...LaraBase,
  components: {
    button: LaraButton,
    checkbox: LaraCheckbox,
    datatable: LaraDataTable,
    dialog: LaraDialog,
    drawer: LaraDrawer,
    fileupload: LaraFileUpload,
    message: LaraMessage,
    multiselect: LaraMultiSelect,
    paginator: LaraPaginator,
    panelmenu: LaraPanelMenu,
    ripple: LaraRipple,
    select: LaraSelect,
    toast: LaraToast,
  },
};

export default LaraDashboard;
