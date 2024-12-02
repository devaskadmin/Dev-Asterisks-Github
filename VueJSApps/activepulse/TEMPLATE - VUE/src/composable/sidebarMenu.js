import { ref } from "vue";

export const sidebarMenus = ref([
    {
        menu_name: 'sidebar.dashboard',
        menus: [
            {
                name: 'sidebar.ecommerce',
                link_name: 'dashboard_index',
                icon: 'fa-light fa-cart-shopping-fast'
            },
            {
                name: 'sidebar.crm',
                link_name: 'crm_dashboard',
                icon: 'fa-light fa-user-headset'
            },
            {
                name: 'sidebar.hrm',
                link_name: 'hrm_dashboard',
                icon: 'fa-light fa-user-tie'
            },
        ]
    },
    {
        menu_name: 'Apps',
        menus: [
            {
                name: 'CRM',
                icon: 'fa-light fa-user-headset',
                sub_menus: [
                    { name: 'Target Audience', link_name: 'crm_audience' },
                    { name: 'Company', link_name: 'crm_company' },
                    { name: 'Task', link_name: 'crm_task' },
                    { name: 'Leads', link_name: 'crm_leads' },
                    { name: 'Customer', link_name: 'crm_customer' },
                ]
            },
            {
                name: 'HRM',
                icon: 'fa-light fa-user-tie',
                sub_menus: [
                    { name: 'Add Employee', link_name: 'hrm_add_employee' },
                    { name: 'All Employee', link_name: 'hrm_all_employee' },
                    { name: 'Attendance', link_name: 'hrm_attendance' },
                ]
            },
            {
                name: 'Ecommerce',
                icon: 'fa-light fa-cart-shopping-fast',
                sub_menus: [
                    { name: 'All Customer', link_name: 'all_customer' },
                    { name: 'Add Product', link_name: 'add_product' },
                    { name: 'All Product', link_name: 'all_product' },
                    { name: 'Category', link_name: 'category' },
                    { name: 'Order', link_name: 'order' },
                ]
            },
            {
                name: 'Chat',
                link_name: 'chat',
                icon: 'fa-light fa-messages'
            },
            {
                name: 'Calendar',
                link_name: 'calendar',
                icon: 'fa-light fa-calendar'
            },
            {
                name: 'Email',
                link_name: 'email',
                icon: 'fa-light fa-envelope'
            },
        ]
    },
    {
        menu_name: 'Pages',
        menus: [
            {
                name: 'Authentication',
                icon: 'fa-light fa-user-cog',
                sub_menus: [
                    { name: 'Login 01', link_name: 'login' }
                ]
            }
        ]
    },
    {
        menu_name: 'Components',
        menus: [
            {
                name: 'Advance UI',
                icon: 'fa-light fa-layer-group',
                sub_menus: [
                    { name: 'Sweet Alert', link_name: 'sweet_alert' }
                ]
            }
        ]
    }
]);
