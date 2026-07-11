<?php

namespace App\Models\User\HotelBooking;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Coupon extends Model
{
    use HasFactory;

    public $table = 'user_room_coupons';

    protected $guarded = [];
}
