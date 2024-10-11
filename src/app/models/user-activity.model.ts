export interface UserActivity {
    originButton: string;
    type_of_activity: 'click_on' | 'access' | 'login' | 'logout' | 'specific_action';
    action: string | string[];
    description?: string;
    data_description?: object;
    nav_description?: string[];
}

export interface SuperFilterInput {
    name: string;
    filterList: any[];
    filterValue: string;
    savedValue: string;
    displayKey: string;
    needTranslateKey: Boolean;
}
