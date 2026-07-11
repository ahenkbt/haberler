<?php

namespace App\Models\User\CourseManagement;

use App\Models\Customer;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class CourseEnrolment extends Model
{
    use HasFactory;

    protected $table = 'user_course_enrolments';
    /**
     * The attributes that are mass assignable.
     *
     * @var array
     */
    protected $fillable = [
        'user_id',
        'customer_id',
        'order_id',
        'billing_first_name',
        'billing_last_name',
        'billing_email',
        'billing_contact_number',
        'billing_address',
        'billing_city',
        'billing_state',
        'billing_country',
        'course_id',
        'course_price',
        'discount',
        'grand_total',
        'currency_text',
        'currency_text_position',
        'currency_symbol',
        'currency_symbol_position',
        'payment_method',
        'gateway_type',
        'payment_status',
        'attachment',
        'invoice',
        'conversation_id'
    ];

    public function customer()
    {
        return $this->belongsTo(Customer::class, 'customer_id');
    }

    public function userInfo()
    {
        return $this->belongsTo(User::class, 'user_id', 'id');
    }

    public function course()
    {
        return $this->belongsTo(Course::class, 'course_id', 'id');
    }

    public function courseInfos()
    {
        return $this->hasMany(CourseInformation::class, 'course_id');
    }
}
