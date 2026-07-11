<div class="col-lg-5">
    <table class="table table-striped" style="border: 1px solid #0000005a;">
        <thead>
            <tr>
                <th scope="col">{{ __('Short_Code') }}</th>
                <th scope="col">{{ __('Meaning') }}</th>
            </tr>
        </thead>
        <tbody>
            @if ($templateInfo->email_type == 'donation_approved' || $templateInfo->email_type == 'donation')
                <tr>
                    <td>{donor_name}</td>
                    <td scope="row">{{ __('Name_of_The_Donor') }}</td>
                </tr>
                <tr>
                    <td>{cause_name}</td>
                    <td scope="row">{{ __('Name_of_The_Cause') }}</td>
                </tr>
            @else
                <tr>
                    <td>{customer_name}</td>
                    <td scope="row">{{ __('Name_of_The_Customer') }}</td>
                </tr>
            @endif
            @if ($templateInfo->email_type == 'email_verification')
                <tr>
                    <td>{verification_link}</td>
                    <td scope="row">{{ __('Email_Verification_Link') }}</td>
                </tr>
            @endif
            @if ($templateInfo->email_type == 'reset_password')
                <tr>
                    <td>{password_reset_link}</td>
                    <td scope="row">{{ __('Password_Reset_Link') }}</td>
                </tr>
            @endif
            <tr>
                <td>{website_title}</td>
                <td scope="row">{{ __('Website_Title') }}</td>
            </tr>
            @if ($templateInfo->email_type == 'room_booking')
                <tr>
                    <td>
                        {booking_number}
                    </td>
                    <th scope="row">
                        {{ __('Booking_Number') }}
                    </th>
                </tr>
                <tr>
                    <td>
                        {booking_date}
                    </td>
                    <th scope="row">
                        {{ __('Booking_Date') }}
                    </th>
                </tr>
                <tr>
                    <td>
                        {number_of_night}
                    </td>
                    <th scope="row">
                        {{ __('Number_of_Nights') }}
                    </th>
                </tr>
                <tr>
                    <td>
                        {check_in_date}
                    </td>
                    <th scope="row">
                        {{ __('Check_in_Date') }}
                    </th>
                </tr>
                <tr>
                    <td>
                        {check_out_date}
                    </td>
                    <th scope="row">
                        {{ __('Check_out_Date') }}
                    </th>
                </tr>
                <tr>
                    <td>
                        {number_of_guests}
                    </td>
                    <th scope="row">
                        {{ __('Number_of_Guests') }}
                    </th>
                </tr>
                <tr>
                    <td>
                        {room_name}
                    </td>
                    <th scope="row">
                        {{ __('Room_Name') }}
                    </th>
                </tr>
                <tr>
                    <td>
                        {room_rent}
                    </td>
                    <th scope="row">
                        {{ __('Room_Rent') }}
                    </th>
                </tr>
                <tr>
                    <td>
                        {room_type}
                    </td>
                    <th scope="row">
                        {{ __('Room_Type') }}
                    </th>
                </tr>
                <tr>
                    <td>
                        {room_amenities}
                    </td>
                    <th scope="row">
                        {{ __('Room_Amenities') }}
                    </th>
                </tr>
            @endif
        </tbody>
    </table>
</div>
