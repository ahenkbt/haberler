<?php

namespace App\Models\User\HotelBooking;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class RoomCategory extends Model
{
    use HasFactory;

    public $table = 'user_room_categories';
    protected $guarded = [];

    public function roomCategoryLang()
    {
        return $this->belongsTo('App\Models\Language');
    }

    public function roomContentList()
    {
        return $this->hasMany(RoomContent::class, 'room_category_id', 'id');
    }
}
