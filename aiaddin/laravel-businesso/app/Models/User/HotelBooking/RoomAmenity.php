<?php

namespace App\Models\User\HotelBooking;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class RoomAmenity extends Model
{
    use HasFactory;

    public $table = 'user_room_amenities';

    protected $guarded = [];

    public function amenityLang()
    {
        return $this->belongsTo('App\Models\Language');
    }
}
