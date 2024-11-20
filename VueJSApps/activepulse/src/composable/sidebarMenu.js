import {ref} from "vue";

export const sidebarMenus = ref([
    {
        menu_name: 'Main Menu',
        menus: [
            {
                name: 'Home',
                link_name: 'dashboard_index',
                icon: 'fa-light fa-home'
            },  
            {
                name: 'User Pages',
                icon: 'fa-light fa-user',
                sub_menus: [
                    {
                        name: 'View Profile',
                        link_name: 'view_profile'
                    },
                    {
                        name: 'Edit Profile',
                        link_name: 'edit_profile'
                    },
                    {
                        name: 'Login',
                        link_name: 'login'
                    },
                    {
                        name: 'Site Registration',
                        link_name: 'registration'
                    },                    
                    {
                        name: 'Reset Password',
                        link_name: 'reset_password'
                    },
                    {
                        name: 'Update Password',
                        link_name: 'update_password'
                    },
                    {
                        name: 'Login Status',
                        link_name: 'login_status'
                    },
                    {
                        name: 'Account Deactivated',
                        link_name: 'account_deactivated'
                    },
                    {
                        name: 'Welcome',
                        link_name: 'welcome'
                    },
                ]
            },          
            
        ]
    },
    {
        menu_name: 'User Account',
        menus: [
           {
                name: 'Ecommerce',
                icon: 'fa-light fa-cart-shopping-fast',
                sub_menus: [
                    {
                        name: 'All Customer',
                        link_name: 'all_customer'
                    },
                    {
                        name: 'Add Product',
                        link_name: 'add_product'
                    },
                    {
                        name: 'All Product',
                        link_name: 'all_product'
                    },
                    {
                        name: 'Category',
                        link_name: 'category'
                    },
                    {
                        name: 'Order',
                        link_name: 'order'
                    },
                ]
            },
            {
                name: 'User',
                icon: 'fa-light fa-user',
                sub_menus: [
                    {
                        name: 'View Profile',
                        link_name: 'view_profile'
                    },
                    {
                        name: 'Edit Profile',
                        link_name: 'edit_profile'
                    },
                ]
            },
            
        ]
    },
    {
        menu_name: 'More Pages',
        menus: [
             {
                name: 'Error Pages',
                icon: 'fa-light fa-triangle-exclamation',
                sub_menus: [
                    {
                        name: 'Error 400',
                        link_name: 'error_400'
                    },
                    {
                        name: 'Error 403',
                        link_name: 'error_403'
                    },
                    {
                        name: 'Error 404',
                        link_name: 'error_404'
                    },
                    {
                        name: 'Error 408',
                        link_name: 'error_408'
                    },
                    {
                        name: 'Error 500',
                        link_name: 'error_500'
                    },
                    {
                        name: 'Error 503',
                        link_name: 'error_503'
                    },
                    {
                        name: 'Error 504',
                        link_name: 'error_504'
                    },
                ]
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
            {
                name: 'Billing',
                link_name: 'invoices',
                icon: 'fa-light fa-file-invoice',
            },            
            {
                name: 'User',
                icon: 'fa-light fa-user',
                sub_menus: [
                    {
                        name: 'View Profile',
                        link_name: 'view_profile'
                    },
                    {
                        name: 'Edit Profile',
                        link_name: 'edit_profile'
                    },
                ]
            },
            {
                name: 'Additional',
                icon: 'fa-light fa-square-plus',
                sub_menus: [
                    {
                        name: 'Coming Soon 01',
                        link_name: 'coming_soon'
                    },
                    {
                        name: 'Coming Soon 02',
                        link_name: 'coming_soon_2'
                    },
                    {
                        name: 'Pricing Table 01',
                        link_name: 'pricing_table'
                    },
                    {
                        name: 'Pricing Table 02',
                        link_name: 'pricing_table_2'
                    },
                    {
                        name: 'Under Construction',
                        link_name: 'under_construction'
                    },
                ]
            },
            {
                name: 'Utility',
                link_name: 'utility',
                icon: 'fa-light fa-layer-group'
            },
            {
                name: 'Error Pages',
                icon: 'fa-light fa-triangle-exclamation',
                sub_menus: [
                    {
                        name: 'Error 400',
                        link_name: 'error_400'
                    },
                    {
                        name: 'Error 403',
                        link_name: 'error_403'
                    },
                    {
                        name: 'Error 404',
                        link_name: 'error_404'
                    },
                    {
                        name: 'Error 408',
                        link_name: 'error_408'
                    },
                    {
                        name: 'Error 500',
                        link_name: 'error_500'
                    },
                    {
                        name: 'Error 503',
                        link_name: 'error_503'
                    },
                    {
                        name: 'Error 504',
                        link_name: 'error_504'
                    },
                ]
            },            
            {
                name: 'Additional',
                icon: 'fa-light fa-square-plus',
                sub_menus: [
                    {
                        name: 'Coming Soon 01',
                        link_name: 'coming_soon'
                    },
                    {
                        name: 'Coming Soon 02',
                        link_name: 'coming_soon_2'
                    },
                    {
                        name: 'Pricing Table 01',
                        link_name: 'pricing_table'
                    },
                    {
                        name: 'Pricing Table 02',
                        link_name: 'pricing_table_2'
                    },
                    {
                        name: 'Under Construction',
                        link_name: 'under_construction'
                    },
                ]
            },
            {
                name: 'Utility',
                link_name: 'utility',
                icon: 'fa-light fa-layer-group'
            },
            {
                name: 'Advance UI',
                icon: 'fa-light fa-layer-group',
                sub_menus: [
                    {
                        name: 'Sweet Alert',
                        link_name: 'sweet_alert'
                    },
                    {
                        name: 'Nestable List',
                        link_name: 'nestable_list'
                    },
                    {
                        name: 'Animation',
                        link_name: 'animation'
                    },
                    {
                        name: 'Swiper Slider',
                        link_name: 'swiper_slider'
                    },
                ]
            },
            {
                name: 'Forms',
                link_name: 'form',
                icon: 'fa-light fa-memo-pad'
            },
            {
                name: 'Tables',
                link_name: 'table',
                icon: 'fa-light fa-table'
            },
            {
                name: 'Icon',
                link_name: 'icon',
                icon: 'fa-light fa-compass-drafting'
            },
            {
                name: 'Map',
                link_name: 'map',
                icon: 'fa-light fa-location-dot'
            },
            {
                name: 'File Manager',
                link_name: 'file_manager',
                icon: 'fa-light fa-folder-open'
            },
            {
                name: 'Multiple Level',
                icon: 'fa-light fa-layer-group',
                sub_menus: [
                    {
                        name: 'Level 1',
                        link_name: null,
                    },
                    {
                        name: 'Level 2',
                        sub_menus: [
                            {
                                name: 'Level 2.1',
                                link_name: null,
                            },
                            {
                                name: 'Level 2.2',
                                sub_menus: [
                                    {
                                        name: 'Level 2.2.1',
                                        link_name: null,
                                    },
                                    {
                                        name: 'Level 2.2.2',
                                        link_name: null,
                                    },
                                ]
                            },
                            {
                                name: 'Level 2.3',
                                link_name: null,
                            },
                            {
                                name: 'Level 2.4',
                                link_name: null,
                            },
                        ]
                    },
                    {
                        name: 'Level 3',
                        link_name: null,
                    },
                ]
            }
        ]
    }
])